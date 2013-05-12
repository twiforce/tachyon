# Load the rails application
require File.expand_path('../application', __FILE__)

RANDOM = 'RANDOM()' if Rails.env.development?
RANDOM = 'RAND()' if Rails.env.production?
MOBILE_USER_AGENTS =  Regexp.new ('palm|blackberry|nokia|phone|midp|mobi|symbian|chtml|ericsson|minimo|' +
                                  'audiovox|motorola|samsung|telit|upg1|windows ce|ucweb|astel|plucker|' +
                                  'x320|x240|j2me|sgh|portable|sprint|docomo|kddi|softbank|android|mmp|' +
                                  'pdxgw|netfront|xiino|vodafone|portalmmm|sagem|mot-|sie-|ipod|up\\.b|' +
                                  'webos|amoi|novarra|cdm|alcatel|pocket|ipad|iphone|mobileexplorer|' +
                                  'mobile|msie') # explorer sucks cocks


Encoding.default_external = Encoding::UTF_8
Encoding.default_internal = Encoding::UTF_8

# Initialize the rails application
Tachyon::Application.initialize!
Rails.cache.clear
