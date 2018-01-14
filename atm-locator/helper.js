const AWS = require('aws-sdk');
const _ = require('lodash');
const docClient = new AWS.DynamoDB.DocumentClient();
const googleApiClient = require('@google/maps').createClient({
    key: <'API Key goes here'>

});

const algoliaSearch = require('algoliasearch');
const algoliaClient = algoliaSearch('<Algolia API Key goes here>','<Algolia API value>');
const algoliaIndex = algoliaClient.initIndex('locations');

const SlackWebhook = require('slack-webhook');
const slack = new SlackWebhook('<Slack Webhook goes here>');

exports.getData = () => {
    const params ={
        TableName : 'location-list'
    };
    return new Promise((resolve, reject) => {
        docClient.scan(params,(err,data) => {
            if(err) {
                reject(err);
                console.error(err)
            } else{
                resolve(data);
        }
    });

    });
}

// This module is used to find out the latitudes and longitudes using the GoogleMaps API

exports.findGeoCode = addressText => {

  return new Promise((resolve,reject) =>  {
      googleApiClient.geocode({
      address: addressText
  }, (err,response)=> {
      if (err){
          reject(err);
      }
      if(response.json.results.length > 0){
          const geometry = response.json.results[0].geometry;
          resolve(geometry.location);
      } else {
          resolve(null);
      }

});
});

};

exports.startStateMachine = location => {
    const params = {
        stateMachineArn: <"ARN for the Lambda function goes here">,
        input: JSON.stringify(location)
    };
    const stepfunctions = new AWS.StepFunctions();
    stepfunctions.startExecution(params,(err,data)=> {
        if(err){
            console.err(err)
        } else{
            console.log("State machine started successfully");
            console.log(data);
        }
    });
};

// Push data to Algolia Search database
exports.pushToAlgolia = location => {
    return algoliaIndex.addObject(location);

};

//Send a Slack notification
exports.sendToSlack = message =>{
    slack.send(message)
        .then(data => {
            console.log(data);
    })
        .catch(err =>{
            console.log(err);
    })
}

exports.removeFromAlgolia = locationId => {
    return algoliaIndex.deleteObject(locationId);
};

exports.searchAlgolia = geoCodes => {

    return algoliaIndex.search({
        aroundLatLng: `${geoCodes.lat}, ${geoCodes.lng}`,
        aroundRadius: 7000
    });
};