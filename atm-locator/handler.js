const helper = require('./helper');
const _ = require('lodash');

module.exports.run = (event,context,callback) => {

  helper.getData()
      .then(results => {
          _.forEach(results.Items,location => {
              console.log("Starting State machine for location: " + location.locationId);
              helper.startStateMachine(location);
  });
  })
      .catch(err => {
           console.log(err);
           callback(err);
    });
};


module.exports.findGeoCode = (event,context,callback) => {

   const location = event;
   const addressText = `${location.line1}, ${location.city}, ${location.zipCode}`;
   location.searchable = false;

    helper.findGeoCode(addressText)
        .then(geoCodes => {
            if(geoCodes){
                location._geoloc = {
                    lat: geoCodes.lat,
                    lng: geoCodes.lng
                };
                location.searchable = true;
            }
            console.log("location is " + location);
            callback(null, location);
        })
        .catch(err => {
            console.log("There was an error" + err);
            callback(err);
    })

};


module.exports.pushToAlgolia = (event,context,callback) => {
    const location = event;
    location.objectID = event.locationId;
    helper.pushToAlgolia(location)
        .then(results => {
            const message = `${location.locationId} pushed to Algolia`;
            helper.sendToSlack(message);
            callback(null, message);
    })
        .catch(err => {
            calback(err);
    })

};


module.exports.locationFailed = (event, context, callback) => {

    const message =`Location ${event.locationId} not pushed to Algolia`;
    helper.sendToSlack(message);
    callback(null,message);
};

module.exports.processUpdates = (event,context, callback) => {
    event.Records.forEach(record => {
        if(record.eventName === "INSERT"
)
    {
        const data = record.dynamodb.NewImage;
        const location = {

            locationId: data.locationId.S,
            line1: data.line1.S,
            line2: data.line2.S,
            city: data.city.S,
            state: data.state.S,
            country: data.country.S,
            zipCode: data.zipCode.S

        };
        helper.startStateMachine(location);

    }
else
    if (record.eventName === "MODIFY") {

        const dataOld = record.dynamodb.OldImage;
        const locationIdOld = dataOld.locationId.S;

        const data = record.dynamodb.NewImage;
        const locationNew = {

            locationId: data.locationId.S,
            line1: data.line1.S,
            line2: data.line2.S,
            city: data.city.S,
            state: data.state.S,
            country: data.country.S,
            zipCode: data.zipCode.S

        };
        helper.startStateMachine(locationNew);

        helper.removeFromAlgolia(locationIdOld)
            .then(() => {
            helper.sendToSlack(`${locationIdOld} was removed from Algolia`);
    })
    .
        catch(err => {
            console.log(err);
        helper.sendToSlack(err);
    })

    } else if (record.eventName === "REMOVE") {

        const data = record.dynamodb.OldImage;
        const locationId = data.locationId.S;

        helper.removeFromAlgolia(locationId)
            .then(() => {
            helper.sendToSlack(`${locationId} was removed from Algolia`);
    })
    .
        catch(err => {
            console.log(err);
        helper.sendToSlack(err);
    })


    }
}
    )

};

module.exports.findLocations = (event, context, callback) => {

    const address = event.queryStringParameters.address;

    helper.findGeoCode(address)
        .then(geoCodes => {
            if(geoCodes){

                helper.searchAlgolia(geoCodes)
                    .then(results => {

                        const response ={

                            statusCode: 200,
                            body: JSON.stringify(results)
                        };
                        callback(null, response);
                    })
                    .catch(err => {

                        const response ={

                            statusCode : 500,
                            body : "Internal Server error " + err
                        };
                        callback(null, response);
                    })
            }
            else {

                const response ={
                    statusCode : 400,
                    body : "Invalid address " + address
                };
                callback(null, response);
            }
    })
}