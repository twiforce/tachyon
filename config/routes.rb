Tachyon::Application.routes.draw do
  root to: 'application#index'
  faye_server '/comet', timeout: 50

  scope 'utility' do 
    match 'get_tags'          => 'application#get_tags',                                    via: 'post'
    match 'get_post'          => 'threads#get_post',                                        via: 'post'
    match 'edit_post'         => 'threads#edit_post',                                       via: 'post'
    match 'delete_post'       => 'threads#delete_post',                                     via: 'post'
    match 'ping'              => 'application#ping',                                        via: 'post'
    match 'mobile-off'        => 'application#mobile_off',                                  via: 'get'
    match 'gc'                => 'application#gc',                                          via: 'get'
  end

  scope 'about' do
    match ''                  => 'about#site'
    match 'engine'            => 'about#engine'
    match 'rules'             => 'about#rules'
    match 'faq'               => 'about#faq'
    match 'modlog'            => 'about#modlog'
  end

  scope 'admin' do 
    match 'login'             => 'admin#login',                                             via: 'post'
    match 'settings/get'      => 'admin#get_settings',                                      via: 'post'
    match 'settings/set'      => 'admin#set_settings',                                      via: 'post'
    match 'post_info'         => 'admin#post_info',                                         via: 'post'
    match 'hexenhammer'       => 'admin#hexenhammer',                                       via: 'post'
  end

  match ':rid.html'           => 'threads#show_old',        constraints: { rid: /\d+/ }
  match 'live'                => 'threads#live'
  match 'thread/:rid'         => 'threads#show',            constraints: { rid: /\d+/ }
  match 'thread/:rid/reply'   => 'threads#reply',           constraints: { rid: /\d+/ },    via: 'post'
  match 'thread/:rid/expand'  => 'threads#expand',          constraints: { rid: /\d+/ },    via: 'post'
  match 'create'              => 'threads#create',                                          via: 'post'
  match ':tag'                => 'threads#index'
  match ':tag/page/:page'     => 'threads#page',            constraints: { page: /\d+/ }
  match '*path'               => 'threads#index'
end
