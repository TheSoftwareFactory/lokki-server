#Signup

##Description
Signup API Calls

***

##`POST` /signup
Signup new user

###Parameters
- **request body** _(required)_ - Included in this body is:
	#####body
	- 'email' - Email of the new user _(string)_
	- 'deviceId' - Device type of the new user _(string)_
	- 'language' - Language of new user _(optional)_ _(string)_

###Return
- Returns status and result of action

***

#CrashReport

##Description
Crash Report Calls

***
##Requires Authentication
* Requires valid User ID when querying API

***

##`POST` /crashReport/:userId
Store crash report for user

###Parameters
- **userId** _(required)_ - Id of current user
- **request body** _(required)_ - Included in this body is:
	#####body
	- 'osType': OS _(must be one of)_ ['android', 'ios', 'wp'] _(string)_
	- 'osVersion': (e.g. '4.4.0-Kitkat SDK whatever') _(string)_
	- 'lokkiVersion': (e.g. Lokki 1.2.3) _(string)_
	- 'reportTitle':  (e.g. 'Lokki crash NullPointerException') _(string)_
	- 'reportData': _(string)_

###Return
- Returns status and result of action

***

#Account Reset

##Description
Account Reset Calls

***

##`GET` /reset/:resetId
Account reset/recovery using confirmation code

###Parameters
- **resetId** _(required)_ - Id of reset

###Return
- Returns status and result of action

