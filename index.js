'use strict';

var accountSid = 'ACf8c71188ef7f95059ac67cbe5820ebe0';
var authToken = "6284ff20f4827201e82e29f029da6718";

var twilioClient = require('twilio')(accountSid, authToken);
var crypto = require('crypto');
var https = require('https');
var url = require('url');
var querystring = require('querystring');

/**
 * This sample demonstrates a simple skill built with the Amazon Alexa Skills Kit.
 * The Intent Schema, Custom Slots, and Sample Utterances for this skill, as well as
 * testing instructions are located at http://amzn.to/1LzFrj6
 *
 * For additional samples, visit the Alexa Skills Kit Getting Started guide at
 * http://amzn.to/1LGWsLG
 */

// --------------- API Library -------------------

/**
 * Usage Example
 * var api = new apimedicApi('me@zacyu.com', 'Cx79NfDe58PmQa2j3');
 * api.getDiagnosis(['9', '13'], 'male', '1997', function(e) {
 *  console.log(e);
 * });
 */

// FYI: to get year -> (new Date()).getUTCFullYear()

function apimedicApi(username, password) {
    var AUTH_ADDRESS = 'https://sandbox-authservice.priaid.ch/login';
    var API_BASE = 'https://sandbox-healthservice.priaid.ch/';

    this.username_ = username;
    this.password_ = password;
    this.token_ = '';
    this.validUntil_ = 0;

    this.renew_ = function(callback) {
      if (this.validUntil_ < Date.now() / 1000 - 60) {
        this.getToken_(callback);
      } else if (typeof callback == 'function') {
        callback();
      }
    };

    var self = this;

    this.getToken_ = function(callback) {
      var authUrl = url.parse(AUTH_ADDRESS);
      var authHash = crypto.createHmac('md5', password).
        update(AUTH_ADDRESS).digest('base64');
      var options = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.username_}:${authHash}`
        },
        hostname: authUrl.host,
        path: authUrl.pathname,
        port: 443,
        method: 'POST'
      };
      var req = https.request(options, function(res) {
        res.on('data', function (data) {
          var parsedData = JSON.parse(data);
          if (typeof parsedData == 'object' && parsedData.Token && parsedData.ValidThrough) {
            self.token_ = parsedData.Token;
            self.validUntil_ = Date.now() / 1000 + parsedData.ValidThrough;
            if (typeof callback == 'function') {
              callback();
            }
          } else {
            throw 'Failed to authenticate.';
          }
        });
      });
      req.end();
    };

    this.getDiagnosis = function(symptoms, gender, yearOfBirth, callback) {
      var apiUrl = url.parse(API_BASE + 'diagnosis');
      var self = this;

      this.renew_(function() {
        var options = {
          headers: {
            'Content-Type': 'application/json'
          },
          hostname: apiUrl.host,
          path: apiUrl.pathname + '?' + querystring.stringify({
            'token': self.token_,
            'symptoms': JSON.stringify(symptoms),
            'gender': gender,
            'year_of_birth': yearOfBirth,
            'language': 'en-gb',
            'format': 'json'
          }),
          port: 443,
          method: 'GET'
        };
        var req = https.request(options, function(res) {
          res.on('data', function (data) {
            var parsedData = JSON.parse(data);
            if (typeof parsedData == 'object') {
              callback(parsedData);
            } else {
              throw 'Failed to get data.';
            }
          });
        });
        req.end();
      });
    }

    this.getProposedSymptoms = function(symptoms, gender, yearOfBirth, callback) {
      var apiUrl = url.parse(API_BASE + 'symptoms/proposed');
      var self = this;

      this.renew_(function() {
        var options = {
          headers: {
            'Content-Type': 'application/json'
          },
          hostname: apiUrl.host,
          path: apiUrl.pathname + '?' + querystring.stringify({
            'token': self.token_,
            'symptoms': JSON.stringify(symptoms),
            'gender': gender,
            'year_of_birth': yearOfBirth,
            'language': 'en-gb',
            'format': 'json'
          }),
          port: 443,
          method: 'GET'
        };
        var req = https.request(options, function(res) {
          res.on('data', function (data) {
            var parsedData = JSON.parse(data);
            if (typeof parsedData == 'object') {
              callback(parsedData);
            } else {
              throw 'Failed to get data.';
            }
          });
        });
        req.end();
      });
    }


    return this;
}

// --------------- Helpers that build all of the responses -----------------------

let shouldEndSession = false;

var symptomsDict = { "abdominal pain": 10, "anxiety": 238, "back pain": 104, "burning eyes": 75, "burning in the throat": 46, "cheek swelling": 170, "chest pain": 17, "chest tightness": 31, "chills": 175, "cold sweats": 139, "cough": 15, "dizziness": 207, "drooping eyelids": 244, "dry eyes": 273, "earache": 87, "early satiety": 92, "eye pain": 287, "eye redness": 33, "fast, deepened breathing": 153, "something in my eye": 76, "fever": 11, "going black before the eyes": 57, "headache": 9, "heartburn": 45, "hiccups": 122, "hot flashes": 149, "increased thirst": 40, "itching eyes": 73, "itching in the nose": 96, "lip swelling": 35, "memory gap": 235, "menstruation disorder": 112, "missed period": 123, "nausea": 44, "neck pain": 136, "nervousness": 114, "night cough": 133, "pain in the limbs": 12, "pain on swallowing": 203, "palpitations": 37, "paralysis": 140, "reduced appetite": 54, "runny nose": 14, "shortness of breath": 29, "skin rash": 124, "sleeplessness": 52, "sneezing": 95, "sore throat": 13, "sputum": 64, "stomach burning": 179, "stuffy nose": 28, "sweating": 138, "swollen glands in the armpits": 248, "swollen glands on the neck": 169, "tears": 211, "tiredness": 16, "tremor at rest": 115, "unconsciousness": 144, "vomiting": 101, "vomiting blood": 181, "weakness": 56, "weight gain": 23, "wheezing": 30 };

var api = new apimedicApi('me@zacyu.com', 'Cx79NfDe58PmQa2j3');

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: 'PlainText',
            text: output,
        },
        card: {
            type: 'Simple',
            title: `Title - ${title}`,
            content: `Content - ${output}`,
        },
        reprompt: {
            outputSpeech: {
                type: 'PlainText',
                text: repromptText,
            },
        },
        shouldEndSession,
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: '1.0',
        sessionAttributes,
        response: speechletResponse,
    };
}


// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    const sessionAttributes = {};
    const cardTitle = 'Welcome';
    const speechOutput = 'Welcome to Diagnose-Me. Is this an emergency?';



    //First, give me your age and gender.  Then, list your symptoms and when done, say "diagnose me".';
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    const repromptText = 'Please tell me a symptom by saying, ' +
        'I have some symptom or I am feeling something.';
    const shouldEndSession = false;

    callback({
        Question: "emergency"
    },
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function handleSessionEndRequest(callback, sayThanks) {
    const cardTitle = 'Session Ended';
    const speechOutput = sayThanks ? 'Thank you for using Diagnose Me. Have a nice day!' : 'Have a nice day!';
    // Setting this to true ends the session and exits the skill.
    const shouldEndSession = true;

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}


function addSymptomToSession(intent, session, callback) {
    let speechOutput = "";
    let repromptText = "If you would like some suggestions of symptoms, say what are some symptoms";
    let listOfSymptoms = [];
    let userAge = -1;
    let userGender = "";

    if (typeof session.attributes == 'object') {
        userAge = session.attributes.Age || -1;
        userGender = session.attributes.Gender || "";
        listOfSymptoms = session.attributes.Symptoms || [];
    }

    if (userAge == -1 && userGender == ""){
        speechOutput = "Please say your age and gender.";
    } else {
        var symptom = intent.slots.Symptom;
        const repromptText = null;
        speechOutput = '';

        if (symptom) {
            var manySymptoms = symptom.value.split(" and ");

            manySymptoms.forEach(function(s){
                if(s.startsWith("a ")){
                    s = s.substring(2);
                }
                if (isValidSymptom(s)) {
                  if (listOfSymptoms.indexOf(s) < 0) {
                    listOfSymptoms.push(s);
                  }
                } else {
                  speechOutput = "Some of your symptoms were not recognized. ";
                }
            });

            shouldEndSession = false;
        } else {
            speechOutput = "I'm not sure what your symptom is. Instead, you can say 'I am feeling hot.'";
        }

        for (var i = 0; i < listOfSymptoms.length; i++) {
            if(i == 0 && listOfSymptoms.length > 1){
                speechOutput += " Your symptoms are: " + listOfSymptoms[i] + ", ";
            } else if (listOfSymptoms.length == 1){
                speechOutput += " Your symptom is: " + listOfSymptoms[i];
            } else if(i == listOfSymptoms.length-1){
                speechOutput += "and " + listOfSymptoms[i] + ".";
            } else{
                speechOutput += listOfSymptoms[i] + " ";
            }
        }
    }
    // Setting repromptText to null signifies that we do not want to reprompt the user.
    // If the user does not respond or says something that is not understood, the session
    // will end.
    callback({
           Symptoms: listOfSymptoms,
           Age: userAge,
           Gender: userGender
    },
         buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));

}

function removeSymptomFromSession(intent, session, callback){
    let speechOutput = "";
    let repromptText = "If you would like some suggestions of symptoms, say what are some symptoms";
    let listOfSymptoms = [];
    let symptomToRemove = intent.slots.Symptom.value; //TODO:Be able to remove several at a time

    let userAge = -1;
    let userGender = "";

    if (typeof session.attributes == "object") {
        userAge = session.attributes.Age || -1;
        userGender = session.attributes.Gender || "";
        listOfSymptoms = session.attributes.Symptoms || [];
    }

    if (userAge == -1 && userGender == ""){
        speechOutput = "Please say your age and gender.";
    } else {
        var symptomIndex = listOfSymptoms.indexOf(symptomToRemove);
        if (symptomIndex > -1) {
            listOfSymptoms.splice(symptomIndex, 1); //Remove 1 item at indexSymptom
            speechOutput = symptomToRemove + " has been removed.";
        } else if (isValidSymptom(symptomToRemove)) {
            speechOutput = symptomToRemove + " is not a valid symptom.";
        } else {
            speechOutput = symptomToRemove + " is not one of your symptoms.";
        }

        for (var i = 0; i < listOfSymptoms.length; i++) { //Speak list to user
            if(i == 0 && listOfSymptoms.length > 1){
                speechOutput += " Your symptoms are: " + listOfSymptoms[i] + ", ";
            } else if (listOfSymptoms.length == 1){
                speechOutput += " Your symptom is: " + listOfSymptoms[i];
            } else if(i == listOfSymptoms.length-1){
                speechOutput += "and " + listOfSymptoms[i] + ".";
            } else{
                speechOutput += listOfSymptoms[i] + " ";
            }
        }
    }

    callback({
        Symptoms: listOfSymptoms,
        Age: userAge,
        Gender: userGender
    },
             buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
}

function suggestSymptomFromSession(intent, session, callback){
      var api = new apimedicApi('me@zacyu.com', 'Cx79NfDe58PmQa2j3');
      let speechOutput = "";

      let listOfSymptoms = [];
      let userAge = -1;
      let userGender = "";

      if (typeof session.attributes == "object") {
         userAge = session.attributes.Age || -1;
         userGender = session.attributes.Gender || "";
         listOfSymptoms = session.attributes.Symptoms || [];
      }

     if (userAge == -1 && userGender == ""){
        speechOutput = "Please say your age and gender.";
        callback({
           Symptoms: listOfSymptoms,
           Age: userAge,
           Gender: userGender
        }, buildSpeechletResponse(intent.name, speechOutput, null, shouldEndSession));
     } else {
        var date = new Date();
        var year = date.getFullYear();

        var symptomsIDs = convertSymptomsToIDs(listOfSymptoms);

        api.getProposedSymptoms(symptomsIDs, userGender, year-userAge, function(data){
            speechOutput = "Do you have any of the following symptoms? ";
            data.forEach(function(symptom) {
              speechOutput += symptom.Name + "? ";
            });

            if (data.length == 0) {
              speechOutput = "Sorry but we can't find any probable symptoms based on your current symptoms. Please try to remove some that don't apply to you.";
            }

            callback({
              Symptoms: listOfSymptoms,
              Age: userAge,
              Gender: userGender,
              Question: "suggest"
            }, buildSpeechletResponse(intent.name, speechOutput, null, shouldEndSession));
      });
   }
}

function getAgeAndGender(intent, session, callback){
    var userAge = intent.slots.Age.value > 0 ? intent.slots.Age.value : -1;
    var userGender = (intent.slots.Gender.value.toLowerCase() == "male" || intent.slots.Gender.value.toLowerCase() == "female") ?           intent.slots.Gender.value : "";
    let speechOutput = "Age " + userAge + " Gender " + userGender + ". If this is correct, tell me your symptoms.";

    callback({
        Symptoms: session.attributes ? session.attributes.Symptoms : [],
        Age: userAge,
        Gender: userGender
    },
             buildSpeechletResponse(intent.name, speechOutput, null, shouldEndSession));
}


function isValidSymptom(symp){
    return symptomsDict[symp] > 0;
}

function convertSymptomsToIDs(listOfSymptoms){
    var idArr = [];

    var ids = listOfSymptoms.forEach(function(item){
        idArr.push(symptomsDict[item.toLowerCase()].toString());
    });

    return idArr;
}

function fixName(specialisationName) {
    if (specialisationName.endsWith('practice')) {
      return specialisationName.slice(0, -2) + 'tioner';
    } else if (specialisationName.endsWith('gy')) {
      return specialisationName.slice(0, -1) + 'ist';
    } else {
      return specialisationName + ' doctor';
    }
}

function diagnose(intent, session, callback){
   let speechOutput = "";
   let repromptText = "";

   let listOfSymptoms = [];
   let userAge = -1;
   let userGender = "";

   if (typeof session.attributes == "object") {
      userAge = session.attributes.Age || -1;
      userGender = session.attributes.Gender || "";
      listOfSymptoms = session.attributes.Symptoms || [];
   }

   if (userAge == -1 && userGender == ""){
      speechOutput = "Please say your age and gender.";
      callback({
         Symptoms: listOfSymptoms,
         Age: userAge,
         Gender: userGender
      }, buildSpeechletResponse(intent.name, speechOutput, null, shouldEndSession));
   } else {
      var date = new Date();
      var year = date.getFullYear();

      var symptomsIDs = convertSymptomsToIDs(listOfSymptoms);

      api.getDiagnosis(symptomsIDs, userGender, year-userAge, function(data){
          var numbersToNames = ["first", "second", "third"];

          for(var i = 0; i < Math.min(3, data.length); i++){
            var entry = data[i].Issue;
            var entryName = entry.Name;
            var entryID = entry.ID;
            var entryAcc = entry.Accuracy;
            speechOutput += numbersToNames[i] + " condition is " + entryName + " with accuracy " + Math.round(entryAcc) + "%. ";
          }

          if(data.length == 0){
                speechOutput = "No diagnosis available.";
          } else{
              var prescribedMedication = prescribeMedication(data[0].Issue.Name.toLowerCase(), userAge, listOfSymptoms);

              if (prescribedMedication.length) {
                speechOutput += " The recommended medication for your age based on your " + data[0].Issue.Name.toLowerCase() + " is: " + prescribedMedication + ". If the problem persists, contact a general practitioner.";
              } else if (data[0].Issue.Accuracy > 70){

                  speechOutput += "For " + data[0].Issue.Name + ", contact a ";
                  var numDoctors = 0;
                  data[0].Specialisation.forEach(function(item){
                      numDoctors++;
                      if(numDoctors == 1) speechOutput += fixName(item.Name);
                      else speechOutput += "or a " + fixName(item.Name);
                  });
                  speechOutput += ".";

                  var illnessesWithMeds = ["cold", "headache", "migraine", "fever", "inflamation of nose and throat", "reflux disease", "constipation", "allergy medication"];

                  if(illnessesWithMeds.indexOf(data[0].Issue.Name.toLowerCase()) == -1){
                        speechOutput += " You should see a doctor immediately.";
                  }
              }
          }
          speechOutput += " Thank you for using Diagnose-Me. Would you like to close Diagnose-Me?";
          callback({
            Symptoms: listOfSymptoms,
            Age: userAge,
            Gender: userGender,
            Question: 'close'
          }, buildSpeechletResponse(intent.name, speechOutput, null, false)); //Change back to true to end the session here
      });
   }
}

function handleInvalidInput(intent, session, callback){
    var speechOutput = "That is invalid input.";
    let listOfSymptoms = [];
    let userAge = -1;
    let userGender = "";

    if (typeof session.attributes == "object") {
      userAge = session.attributes.Age || -1;
      userGender = session.attributes.Gender || "";
      listOfSymptoms = session.attributes.Symptoms || [];
    }


     callback({
        Symptoms: listOfSymptoms,
        Age: userAge,
        Gender: userGender
     }, buildSpeechletResponse(intent.name, speechOutput, null, false));
}

function handleYesIntent(intent, session, callback) {
    var speechOutput = "I'm listening.";
    let listOfSymptoms = [];
    let userAge = -1;
    let userGender = "";
    let question = "";

    if (typeof session.attributes == "object") {
      userAge = session.attributes.Age || -1;
      userGender = session.attributes.Gender || "";
      listOfSymptoms = session.attributes.Symptoms || [];
      question = session.attributes.Question || "";
    }

    if (question == "suggest") {
        speechOutput = "Please list the symptoms that match. Starts with 'I have ...'";
    } else if (question == "close") {
        handleSessionEndRequest(callback, false);
        return;
    } else if (question == "emergency") {
    speechOutput = "Say: text 'some number' to send an emergency text.";
    }

     callback({
        Symptoms: listOfSymptoms,
        Age: userAge,
        Gender: userGender,
     }, buildSpeechletResponse(intent.name, speechOutput, null, false));

}

function handleNoIntent(intent, session, callback) {
    var speechOutput = "I'm listening.";
    let listOfSymptoms = [];
    let userAge = -1;
    let userGender = "";
    let question = "";

    if (typeof session.attributes == "object") {
      userAge = session.attributes.Age || -1;
      userGender = session.attributes.Gender || "";
      listOfSymptoms = session.attributes.Symptoms || [];
      question = session.attributes.Question || "";
    }

    if (question == "suggest") {
        speechOutput = "If you have told me all your symptoms, you may start the diagnosis by saying 'diagnose me'.";
    } else if (question == "close") {
      getWelcomeResponse(callback);
      return;
    } else if (question == "emergency") {
        speechOutput = "Great! Let's get started. First, please say your age and gender.";
    }

     callback({
        Symptoms: listOfSymptoms,
        Age: userAge,
        Gender: userGender
     }, buildSpeechletResponse(intent.name, speechOutput, null, false));
}

function prescribeMedication(illness, age, listOfSymptoms){//finish writing
    illness = illness.toLowerCase();
    if((illness == "cold" || illness == "inflammation of the nose and throat") && listOfSymptoms == ['cough']){
        return getMedicationInfo("robitussin", age);
    } else if (illness == "cold") {
        return getMedicationInfo("advil", age);
    } else if (illness == "headache") {
        return getMedicationInfo("tylenol", age);
    } else if (illness == "reflux disease"){
        return getMedicationInfo("tums", age);
    } else {
        return "";
    }
}

function getMedicationInfo(medication, age){
    var adult = (age >= 12);
    //let meds = ['tylenol','advil','robitussin','tums','zantac','miralax', 'claritin'];
    /*if (meds.indexOf(medication) != -1){
        return "Invalid medication or age.";
    }*/

    switch(medication.toLowerCase()){
        case "tylenol":
            if(adult){
                return "2 tablets of tylenol every 4-6 hours. Do not exceed more than 10 pills a day unless a doctor says otherwise";
            } else{
                if(age <= 3){
                    return "5 milliliters of tylenol";
                } else if(age <= 5){
                    return "7.5 milliliters of tylenol";
                } else if(age <= 8){
                    return "10 milliliters of tylenol";
                } else if(age <= 10){
                    return "12.5 milliliters of tylenol";
                } else if(age == 11){
                    return "15 milliliters of tylenol";
                }
            }
            break;
        case "advil":
            if(adult){
                return "1 tablet of advil every 4-6 hours. Do not exceed more than 6 pills a day unless a doctor says otherwise";
            } else{
                return " none. Consult a doctor before taking advil at this age.";
            }
            break;
        case "robitussin":
            if(adult){
                return "Use 10mL of robitussin every 12 hours (no more than 20mL in 24 hours)";
            } else{
                if(age < 4){
                    return "none. Do not use robitussin.";
                } else if(age <= 5){
                    return "Use 2.5 milliliters of robitussin every 12 hours (no more than 5 milliliters in 24 hours";
                } else if(age >= 6 && age <= 11){
                    return "Use 5 milliliters of robitussin every 12 hours (no more than 10 milliliters in 24 hours)";
                }
            }
            break;
        case "tums":
            if(adult){
                return "12 plus tums tablets,chew 2 to 4 tablets.  Ask doctor if you can use with your prescription medecine. No more than 15 pills in 24 hours";
            } else{
                return "Keep tums out of reach of chidren.";
            }
            break;
        case "zantac":
            if(adult){
                return "Zantac! To Relieve: 1 tablet;  To Prevent: 1 tablet 30-60 min before eating. No more than 2 tablets in 24 hours. Don't use if having trouble swallowing food, vomitting with blood, bloody stool.  Don't use with other acid reducers.";
            } else{
                return "none. Consult a doctor before taking zantac at this age.";
            }
            break;
        case "miralax":
            if(age > 16){
                return "Fill Cap with Miralax and mix into 4 to 8 ounces of beverage and drink.  Use once a day for no more than 7 days";
            } else{
                return "none. Consult a doctor before taking miralax at this age.";
            }
            break;
        case "claritin":
            if ( age >= 6){
                return "Take 1 tablet daily; not more than 1 tablet in 24 hours.";
            } else{
                return "none. Consult a doctor before taking claritin at this age.";
            }
            break;
        default:
            return "Invalid medicine or age.";
            break;
    }
}


function readMedFacts(intent, session, callback){//intent "tell me about tylenol", etc
    var userAge = -1;
    var userGender = "";
    let speechOutput = "";
    let listOfSymptoms = [];

    if (typeof session.attributes == "object") {
        userAge = session.attributes.Age || -1;
        userGender = session.attributes.Gender || "";
        listOfSymptoms = session.attributes.Symptoms || [];
    }

    if (userAge == -1 && userGender == ""){
      speechOutput = "Please say your age and gender.";
      callback({
         Symptoms: listOfSymptoms,
         Age: userAge,
         Gender: userGender
      }, buildSpeechletResponse(intent.name, speechOutput, null, shouldEndSession));
    } else{
        let theMed = intent.slots.Med ? intent.slots.Med.value.toLowerCase() : "";

        speechOutput = getMedicationInfo(theMed, userAge);
    }


    callback({
        Symptoms: listOfSymptoms,
        Age: userAge,
        Gender: userGender
    }, buildSpeechletResponse(intent.name, speechOutput, null, shouldEndSession));
}

function twilioIntent(intent, session, callback){
    var userAge = -1;
    var userGender = "";
    let speechOutput = "";
    let listOfSymptoms = [];
    let num = intent.slots.Number.value + '';
    if (/^[1-9][0-9]{9}$/.test(num)) {
      twilioClient.messages.create({
          body: "This is an emergency. Please send help.",
          to: "+1" + num,
          from: "+17325322083"
      }, function(err, sms) {
          speechOutput = "message sent.";
    callback({
          Symptoms: listOfSymptoms,
          Age: userAge,
          Gender: userGender
      }, buildSpeechletResponse(intent.name, speechOutput, null, true));
      });
    } else {
      speechOutput += "Sorry, " + num + " is not a valid number.";
      callback({
          Symptoms: listOfSymptoms,
          Age: userAge,
          Gender: userGender
      }, buildSpeechletResponse(intent.name, speechOutput, null, false));
    }
}

// --------------- Events -----------------------

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log(`onSessionStarted requestId=${sessionStartedRequest.requestId}, sessionId=${session.sessionId}`);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log(`onLaunch requestId=${launchRequest.requestId}, sessionId=${session.sessionId}`);

    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log(`onIntent requestId=${intentRequest.requestId}, sessionId=${session.sessionId}`);

    const intent = intentRequest.intent;
    const intentName = intentRequest.intent.name;


    // Dispatch to your skill's intent handlers
    if (intentName === 'addSymptom') {
        addSymptomToSession(intent, session, callback);
    } else if (intentName == 'removeSymptom') {
        removeSymptomFromSession(intent, session, callback);
    } else if (intentName == 'getAgeAndGender') {
        getAgeAndGender(intent, session, callback);
    } else if (intentName == 'suggestSymptoms') {
        suggestSymptomFromSession(intent, session, callback);
    } else if (intentName == 'diagnose'){
         diagnose(intent, session, callback);
    } else if (intentName == 'getMedFacts') {
         readMedFacts(intent, session, callback);
    } else if (intentName == 'AMAZON.YesIntent') {
         handleYesIntent(intent, session, callback);
    } else if (intentName == 'AMAZON.NoIntent') {
         handleNoIntent(intent, session, callback);
    } else if (intentName == 'twilio'){
         twilioIntent(intent, session, callback);
    } else if (intentName == 'AMAZON.HelpIntent') {
         getWelcomeResponse(callback);
    } else if (intentName == 'AMAZON.StopIntent' || intentName == 'AMAZON.CancelIntent') {
        handleSessionEndRequest(callback, true);
    } else {
        handleInvalidInput(intent, session, callback);
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);
    // Add cleanup logic here
}

// --------------- Main handler -----------------------

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = (event, context, callback) => {
    try {
        console.log(`event.session.application.applicationId=${event.session.application.applicationId}`);

        if (event.session.new) {
            onSessionStarted({ requestId: event.request.requestId }, event.session);
        }

        if (event.request.type === 'LaunchRequest') {
            onLaunch(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'IntentRequest') {
            onIntent(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'SessionEndedRequest') {
            onSessionEnded(event.request, event.session);
            callback();
        }
    } catch (err) {
        callback(err);
    }
};
