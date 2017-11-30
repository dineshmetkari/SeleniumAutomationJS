var webdriver = require('selenium-webdriver');
var SeleniumServer = require('selenium-webdriver/remote').SeleniumServer;
var request = require('request');
//var remoteHub = 'http://hub.crossbrowsertesting.com:80/wd/hub';
var remoteHub = 'http://localhost:4444/wd/hub';
var assert = require('assert')

var username = 'user@email.com'; //replace with your email address 
var authkey = '12345'; //replace with your authkey  

var caps = {
    name : 'Login Form Example',
    build :  '1.0',
    version : '10', 
    platform : 'Windows 7 64-bit', 
    screen_resolution : '1024x768',
    record_video : 'true',
    record_network : 'true',
    browserName : 'Chrome',
    username : username,
    password : authkey
};

var sessionId = null;

//register general error handler
webdriver.promise.controlFlow().on('uncaughtException', webdriverErrorHandler);

//console.log('Connection to the CrossBrowserTesting remote server');

var driver = new webdriver.Builder()
            .usingServer(remoteHub)
            .withCapabilities(caps)
            .build();

//console.log('driver is ', driver)



// All driver calls are automatically queued by flow control.
// Async functions outside of driver can use call() function.
//console.log('Waiting on the browser to be launched and the session to start');

driver.getSession().then(function(session){
    sessionId = session.id_; //need for API calls
    //console.log('Session ID: ', sessionId); 
    //console.log('See your test run at: https://app.crossbrowsertesting.com/selenium/' + sessionId)
});

//load your URL
driver.get('http://crossbrowsertesting.github.io/login-form.html');

//take snapshot via cbt api
driver.call(takeSnapshot);




var expectedTitle="Login Form - CrossBrowserTesting.com";
driver.getTitle().then(function(title) {

    if(expectedTitle === title){
	console.log("Verification Successful - The correct title is displayed on the web page."+ " Exptected: " + expectedTitle +" Actual: " + title);
    }
    else{
        console.log("Verification Failed - An incorrect title is displayed on the web page."+ " Exptected: " + expectedTitle +" Actual: " + title);
    }
});

//driver.findElement(webdriver.By.name('CrossBrowserTesting App')).then(function(element) {
//  console.log('Yes, found the element');
//}, function(error) {
//  console.log('The element was not found, as expected');
//});


 //find checkout and click it 
driver.findElement(webdriver.By.id("username")).sendKeys("tester@crossbrowsertesting.com");

//send keys to element to enter text
driver.findElement(webdriver.By.xpath("//*[@type=\"password\"]")).sendKeys("test123");

//take snapshot via cbt api
driver.call(takeSnapshot);

//click the archive button
driver.findElement(webdriver.By.css("button[type=submit]")).click();

//wait on logged in message
driver.wait(webdriver.until.elementLocated(webdriver.By.id("logged-in-message")), 50000);
//console.log(webdriver.By.id("logged-in-message"));




var expectedTitle="Login Form - CrossBrowserTesting.com";
driver.getTitle().then(function(title) {

    if(expectedTitle === title){
	console.log("Verification Successful - The correct title is displayed on the web page."+ " Exptected: " + expectedTitle +" Actual: " + title);
    }
    else{
        console.log("Verification Failed - An incorrect title is displayed on the web page."+ " Exptected: " + expectedTitle +" Actual: " + title);
    }
});


//take snapshot via cbt api
driver.call(takeSnapshot);


//driver.findElement(webdriver.By.linkText('CrossBrowserTesting App')).then(function(element) {
//  console.log('Yes, found the element');
//}, function(error) {
//  console.log('The element was not found, as expected');
//});

//quit the driver
driver.quit()

//set the score as passing
driver.call(setScore, null, 'pass').then(function(result){
    console.log('set score to pass')
});


//Call API to set the score
function setScore(score) {

    //webdriver has built-in promise to use
    var deferred = webdriver.promise.defer();
    var result = { error: false, message: null }

    if (sessionId){
        
        request({
            method: 'PUT',
            uri: 'https://crossbrowsertesting.com/api/v3/selenium/' + sessionId,
            body: {'action': 'set_score', 'score': score },
            json: true
        },
        function(error, response, body) {
            if (error) {
                result.error = true;
                result.message = error;
            }
            else if (response.statusCode !== 200){
                result.error = true;
                result.message = body;
            }
            else{
                result.error = false;
                result.message = 'success';
            }

            deferred.fulfill(result);
        })
        .auth(username, authkey);
    }
    else{
        result.error = true;
        result.message = 'Session Id was not defined';
        deferred.fulfill(result);
    }

    return deferred.promise;
}

//Call API to get a snapshot 
function takeSnapshot() {

    //webdriver has built-in promise to use
    var deferred = webdriver.promise.defer();
    var result = { error: false, message: null }
    
    if (sessionId){

       
        request.post(
            'https://crossbrowsertesting.com/api/v3/selenium/' + sessionId + '/snapshots', 
            function(error, response, body) {
                if (error) {
                    result.error = true;
                    result.message = error;
                }
                else if (response.statusCode !== 200){
                    result.error = true;
                    result.message = body;
                }
                else{
                    result.error = false;
                    result.message = 'success';
                }
                //console.log('fulfilling promise in takeSnapshot')
                deferred.fulfill(result);
            }
        )
        .auth(username,authkey);
        
    }
    else{
        result.error = true;
        result.message = 'Session Id was not defined';
        deferred.fulfill(result); //never call reject as we don't need this to actually stop the test
    }

    return deferred.promise;
}

//general error catching function
function webdriverErrorHandler(err){

    console.error('There was an unhandled exception! ' + err);

    //if we had a session, end it and mark failed
    if (driver && sessionId){
        driver.quit();
        setScore('fail').then(function(result){
            console.log('set score to fail')
        })
    }
}