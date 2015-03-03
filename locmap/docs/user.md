#User Resource

**Description**

Return data pertaining to a User and their Location

**Requires Authentication**

* Requires valid User ID when querying API


##`POST` /user/:userid/location
Update user location

###Parameters
- **userId** _(required)_ - Id of current user
- **request body** _(required)_ - Included in this body is:
	- 'location' - New location of user
	- 'battery' - Battery status of user 

###Return
- Returns status and result of action


##`POST` /user/:userid/allow
Allow another user(s) to see user's location

###Parameters
- **userId** _(required)_ - Id of current user
- **request body** _(required)_ - Included in this body is:
	- 'emails' - Object containing users' emails we are giving permission to 
		- Format - {integer: email}


###Return
- Returns status and result of action


##`DELETE` /user/:userid/allow/targetUserId
Stop another user from seeing the user's current position

###Parameters
- **userId** _(required)_ - Id of current user
- **targetUserId** _(required)_ - Id of user to block


###Return
- Returns status and result of action


##`PUT` /user/:userid/visibility
Toggle the user's global visibility

###Parameters
- **userId** _(required)_ - Id of current user
- **request body** _(required)_ - Included in this body is:
	- 'visibility' - boolean value describing visibility


###Return
- Returns status and result of action


##`PUT` /user/:userid/language
Set the user's language

###Parameters
- **userId** _(required)_ - Id of current user
- **request body** _(required)_ - Included in this body is:
	- 'language' - string value describing language


###Return
- Returns status and result of action


##`POST` /user/:userid/apnToken
Set the user's remote iOS notification token

###Parameters
- **userId** _(required)_ - Id of current user
- **request body** _(required)_ - Included in this body is:
	- 'apnToken' - iOS apn token
		- **warning** If body.apnToken is undefined, stop sending notifications


###Return
- Returns status and result of action


##`POST` /user/:userid/gcmToken
Set the user's remote android notification token

###Parameters
- **userId** _(required)_ - Id of current user
- **request body** _(required)_ - Included in this body is:
	- 'gcmToken' - android notification token
		- **warning** If body.gcmToken is undefined, stop sending notifications


###Return
- Returns status and result of action


##`POST` /user/:userid/wp8NotificationURL
Set the user's remote Windows Phone 8 notification token

###Parameters
- **userId** _(required)_ - Id of current user
- **request body** _(required)_ - Included in this body is:
	- 'wp8' - android notification token
		- **warning** If body.wp8 is undefined, stop sending notifications


###Return
- Returns status and result of action


##`GET` /user/:userid/dashboard
Get:
	- Locations of users that the current user can see
	- List of users that can see the current user
	- Current global visibility status

###Parameters
- **userId** _(required)_ - Id of current user


###Return
- Returns status and result of action


##`POST` /user/:userid/update/locations
Send notifications to all users the current user can see to update their location

###Parameters
- **userId** _(required)_ - Id of current user


###Return
- Returns status and result of action


##`POST` /user/:userid/place
Store a new place for current user

###Parameters
- **userId** _(required)_ - Id of current user
- **request body** _(required)_ - Included in this body is:
	- 'name' - The name of the place
	- 'lat' - Latitude of place
	- 'lon' - Longitude of place
	- 'rad' - Radius of place
	- 'img' - Image used for place


###Return
- Returns status and result of action
	- If place data is invalid, returns **400**
	- If place limit has been reached, returns **403**


##`PUT` /user/:userid/place/:placeId
Update existing place

###Parameters
- **userId** _(required)_ - Id of current user
- **placeId** _(required)_ - Id of place to update
- **request body** _(required)_ - Included in this body is:
	- 'name' - The name of the place
	- 'lat' - Latitude of place
	- 'lon' - Longitude of place
	- 'rad' - Radius of place
	- 'img' - Image used for place


###Return
- Returns status and result of action
	- If place data is invalid, returns **400**


##`DELETE` /user/:userid/place/:placeId
Delete existing place

###Parameters
- **userId** _(required)_ - Id of current user
- **placeId** _(required)_ - Id of place to delete


###Return
- Returns status and result of action


##`GET` /user/:userid/places
Get all places of user

###Parameters
- **userId** _(required)_ - Id of current user


###Return
- Returns status and result of action
	- Success format:
		- 200, {placeId1: {name: , lat: , long: , rad: , img: }, placeId2: ...}





