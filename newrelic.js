/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/
/**
 * New Relic agent configuration.
 *
 * See lib/config.defaults.js in the agent distribution for a more complete
 * description of configuration variables and their potential values.
 */
exports.config = {
  /**
   * Array of application names.
   */
  'app_name': ['Lokki Server Europe'],
  /**
   * Your New Relic license key.
   */
  'license_key': '195be57424ff13bc71904e56a7c0e330b2f5215b',

  'logging': {
    /**
     * Level at which to log. 'trace' is most useful to New Relic when diagnosing
     * issues with the agent, 'info' and higher will impose the least overhead on
     * production applications.
     */
    'level': 'trace'
  }
};
