require File.expand_path('../boot', __FILE__)
require 'rails/all'

if defined?(Bundler)
  Bundler.require(*Rails.groups(:assets => %w(development test)))
end

module Tachyon
  class Application < Rails::Application
    def self.version 
      '1.09.195'
    end
    config.i18n.default_locale = :ru
    config.encoding = "utf-8"
    config.filter_parameters += ["message[password]", "password"]
    config.assets.enabled = true
    config.assets.version = self.version
  end
  public
end
