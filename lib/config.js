'use strict';
var convict = require('convict');

// define a schema

var conf = convict({
    env: {
        doc: 'The applicaton environment.',
        format: ['production', 'development', 'test'],
        default: 'development',
        env: 'NODE_ENV'
    },
    ip: {
        doc: 'The IP address to bind.',
        format: 'ipaddress',
        default: '127.0.0.1',
        env: 'IP_ADDRESS'
    },
    port: {
        doc: 'The port to bind.',
        format: 'port',
        default: 9000,
        env: 'PORT'
    },
    redis: {
        url: {
            doc: 'Redis connection url.',
            format: String,
            default: 'redis://localhost:6379',
            env: 'REDIS_URL'
        },
        options: {
            doc: 'Redis connection options.',
            format: Object,
            default: {}
        }
    },
    db: {
        sharePrefix: {
            doc: 'Key prefix for share models in database.',
            format: String,
            default: 'locmapsharemodel:'
        },
        userPrefix: {
            doc: 'Key prefix for user data in database.',
            format: String,
            default: 'locmapusers:'
        },
        deleteCodePrefix: {
            doc: 'Key prefix for deletion codes in database',
            format: String,
            default: 'deletecode:'
        }
    },
    neverCrash: {
        doc: 'Allow the server to continue in case of exception.',
        format: Boolean,
        default: false
    },
    pushNotifications: {
        doc: 'Send push notifications to clients.',
        format: Boolean,
        default: false
    },
    sendEmails: {
        doc: 'Send emails using SendGrid.',
        format: Boolean,
        default: false
    },
    sendInviteEmails: {
        doc: 'Send invite emails to users that have not registered',
        format: Boolean,
        default: false
    },
    senderEmail: {
        doc: 'Sender address for emails.',
        format: 'email',
        default: 'no-reply@lokkiapp.com',
        env: 'SENDER_EMAIL_ADDR'
    },
    sendGrid: {
        username: {
            doc: 'Username used to connect to SendGrid service.',
            format: String,
            default: '',
            env: 'SENDGRID_USERNAME'
        },
        password: {
            doc: 'Password used to connect to SendGrid service.',
            format: String,
            default: '',
            env: 'SENDGRID_PASSWORD'
        }
    },
    adminUserId: {
        doc: 'User ID which is given admin access.',
        format: String,
        default: '123456789',
        env: 'LOKKI_ADMIN_USER_ID'
    },
    googleCloudMessagingApiKey: {
        doc: 'Google Cloud Messaging Service API key.',
        format: String,
        default: '',
        env: 'GCM_API_KEY'
    },
    logging: {
        doc: 'Options given as a parameter to logger (https://github.com/baryon/tracer).',
        format: Object,
        default: undefined,
        env: 'LOGGING_OPTIONS'
    },
    codeLengths: {
        confirmation: {
            doc: 'Length of confirmation codes in characters. 2 characters = 1 byte.',
            format: 'int',
            default: 40
        },
        reset: {
            doc: 'Length of reset codes in characters. 2 characters = 1 byte.',
            format: 'int',
            default: 40
        },
        delete: {
            doc: 'Length of delete codes in characters. 2 characters = 1 byte.',
            format: 'int',
            default: 40
        },
        authToken: {
            doc: 'Length of authentication tokens in characters. 2 characters = 1 byte.',
            format: 'int',
            default: 40
        }
    },
    locMapConfig: {
        locationNotificationTimeout: {
            doc: 'Don\'t send notifications if user location is newer than x seconds.',
            format: 'int',
            default: 300
        },
        recoveryCodeTimeout: {
            doc: 'Recovery code timeout.',
            format: 'int',
            default: 3600 * 24
        },
        resetCodeTimeout: {
            doc: 'Reset codes timeout.',
            format: 'int',
            default: 3600 * 24
        },
        confirmationCodeTimeout: {
            doc: 'Confirmation code timeout.',
            format: 'int',
            default: 3600 * 24
        },
        accountRecoveryModeTimeout: {
            doc: 'Account recovery mode (anyone can re-signup) timeout.',
            format: 'int',
            default: 3600 * 2
        },
        adminAccountRecoveryAllowedEmails: {
            doc: 'Admin account recovery allowed email',
            format: Array,
            default: ['admin@example.com']
        },
        baseUrl: {
            doc: 'App base url, used for email links.',
            format: 'url',
            default: 'http://localhost:9000'
        },
        maxAllowToSeeCount: {
            doc: 'Maximum number of users a user can have on their canSeeMe list.',
            format: 'int',
            default: 1000
        },
        maxEmailLength: {
            doc: 'Maximum length for a contact email in canSeeMe list.',
            format: 'int',
            default: 500
        },
        maxPlacesLimitNormalUser: {
            doc: 'Maximum number of places a normal user can add.',
            format: 'int',
            default: 5
        },
        maxPlaceNameLength: {
            doc: 'Maximum length for a place name.',
            format: 'int',
            default: 1000
        },
        notificationCheckPollingInterval: {
            doc: 'How often to trigger pending notifications check in seconds.',
            format: 'int',
            default: 120
        },
        pendingNotificationTimeout: {
            doc: 'How long to wait for location from client before sending a visible notification. Should always be larger than locationNotificationTimeout',
            format: 'int',
            default: 600
        },
        visibleNotificationLimit: {
            doc: 'How often to allow sending a visible notification to user.',
            format: 'int',
            default: 3600 * 24 * 1
        },
        invisibleNotificationLimit: {
            doc: 'How often to allow sending an invisible notification to user.',
            format: 'int',
            default: 60 * 15
        },
        backgroundNotificationInterval: {
            doc: 'How often to run the background user invisible notification loop.',
            format: 'int',
            default: 60 * 60
        },
        backgroundNotificationLocationAgeLimit: {
            doc: 'How old locations should be renewed in the background notification loop.',
            format: 'int',
            default: 60 * 30
        },
        backgroundNotificationUserActivityAgeLimit: {
            doc: 'How recently user must have accessed dashboard in order to receive a background location update poll.',
            format: 'int',
            default: 3600 * 24 * 14
        }
    }
});

// load environment dependent configuration

var env = conf.get('env');
conf.loadFile('./config/' + env + '.json');

// perform validation

conf.validate();

module.exports = conf;
