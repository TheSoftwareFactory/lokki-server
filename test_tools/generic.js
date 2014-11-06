/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/
var User = require('../lib/userModel');
var Family = require('../lib/familyModel');

family1 = new Family('1');
family1.data.members = ['Miguel1', 'Miguel2'];
family1.setData(function (result) {
    console.log(result);
});

var miguel1 = new User('Miguel1');
miguel1.data.family = 1;
miguel1.data.name = 'Miguel 1';
miguel1.setData(function (result) {
    console.log('setData:', result);
});

var miguel2 = new User('Miguel2');
miguel2.data.family = 1;
miguel2.data.name = 'Miguel 2';
miguel2.setData(function (result) {
    console.log('setData:', result);
});

miguel1.dashboard(function (dashboard) {
        console.log('Dash:', dashboard);
    });

//
//family1 = new Family('1');
//family1.getData(function(result){
//    family1.data = result;
//    console.log('datos familia:', family1.data);
//    family1.getFamilyMembersData(function(result){
//        console.log(result);
//    });
//});


//family1.data.name = 'Familia 1';
//family1.data.members = ['Miguel1', 'Miguel2'];
//console.log(family1);
//family1.setData(function(result){
//    console.log(result);
//});

//var getFamilyMembersData = require('../lib/userModel').getFamilyMembersData;
//


//var miguel1 = new User('Miguel1');
//
//miguel1.getData(function(result){
//    console.log(result);
//    miguel1.data = result;
//    miguel1.dashboard(function(dashboard){
//        console.log(dashboard);
//    });
//});


//miguel1.setData(function(result){
//    console.log(result);
//});
//
//var miguel2 = new User('Miguel2');
//miguel2.data.family = 1;
//miguel2.setData(function(result){
//    console.log(result);
//});

//getFamilyMembersData(['Miguel1', 'Miguel2'], function(result){
//    console.log(result);
//});

//miguel1.setData(function (result2) {
//    console.log(result2);
//});
//
//miguel2.setData(function (result2) {
//    console.log(result2);
//});

//
//miguel1.getData(function(result1){
//    if (result1 !== 404) {
//        miguel1.data = result1;
//        console.log(miguel1.data);
//    }
//    else {
//        console.log('Nuevo usuario');
//        miguel1.data.name = miguel1.data.userId;
//        miguel1.setData(function (result2) {
//            console.log(result2);
//        });
//    }
//});

