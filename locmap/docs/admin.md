#Admin Resources

##Description
Administrative API calls

***
##Requires Admin Authentication
* Requires Admin Authentication to access any of the below methods

***

##`GET` /admin/:userId/crashReport/:osType/:year/:month
Get crash reports for given OS and time period

###Parameters
- **userId** _(required)_ - Id of current user (must be admin)
- **OS type** _(required)_ - Get crash reports from this OS
	* Choices - 'android', 'ios', 'wp'
- **year** _(required)_ - Get crash reports from this year
- **month** _(required)_ - Get crash reports from this month

###Return
- Returns status and result of action

***

##`POST` /admin/:userId/accountRecovery
Puts account into recovery mode

###Parameters
- **userId** _(required)_ - Id of current user (must be admin)
- **request body** _(required)_ - Included in this body is:
	- 'email' - Email of the account

###Return
- Returns status and result of action

***

##`GET` /admin/:userId/userStats
Gets current stats of users in db

###Parameters
- **userId** _(required)_ - Id of current user (must be admin)


###Return
- Returns status and result of action
	- Format:
		- 200, {
            totalAccounts: int,
            activatedAccounts: int,
            invitePendingAccounts: int,
            activatedUsersByPlatform: {'ios': int, 'android': int, 'wp8': int, 'noToken': int},
            activatedUsersByVisibility: {'visible': int, 'invisible': int},
            userLocationUpdatedSince: histogram,
            contactsPerActivatedUser: histogram,
            userDashboardAccessSince: histogram
        }

