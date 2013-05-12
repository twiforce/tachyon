# coding: utf-8

class AdminController < ApplicationController
  before_filter do 
    unless params[:action] == 'login' 
      @moder = Moder.find(session[:moder_id])
      return render(text: 'fuck you') unless @moder
    end
  end

  def login
    if (@moder = Moder.authorize(params[:password].to_s))
      session[:moder_id] = @moder.id
      @response[:status] = 'success'
    else 
      @response[:status] = 'fail'
      @response[:errors] = [t('errors.login')]
    end
    respond!
  end

  def post_info
    @post = RPost.get_by_rid(params[:rid].to_i)
    @post = RThread.get_by_rid(params[:rid].to_i) unless @post
    if @post == nil
      return render(text: 'Not found')
    end
    render(layout: nil)
  end

  def get_settings
    @defence = Settings.get.defence
    render(layout: nil)
  end

  def hexenhammer
    @post = RPost.get_by_rid(params[:rid].to_i)
    @post = RThread.get_by_rid(params[:rid].to_i) unless @post
    @response[:errors] = Array.new
    @response[:status] = 'fail'
    @response[:errors] << "not found" if @post == nil
    @response[:errors] << t('errors.admin.reason') if params[:reason].empty?
    if @response[:errors].empty?
      log = AdminLogEntry.new(moder_id: @moder.id, action: "", 
        target: "##{@post.rid}", reason: params[:reason])
      if params[:delete] == 'true'
        counters = get_counters
        counters[:delete] = @post.rid
        token = @post.defence_token
        if token != nil
          token.delete
        end
        @post.destroy
        clear_cache(@post)
        CometController.publish('/counters', counters)
        log.action += "Сообщение удалено. "
      end
      if params[:ban] == 'true'
        days = params[:ban_days].to_i
        ban = Ban.create( reason:   params[:reason],
                          ip_id:    @post.ip_id,
                          moder_id: @moder.id,
                          level:    1,
                          expires:  Time.zone.now + days.days, )
        unless @post.destroyed?
          token = @post.defence_token
          if token != nil
            token.delete
          end
          @post.defence_token_id = nil
          @post.save
        end
        log.action += "Автор забанен на #{days} суток. "
      end
      if @post.kind_of?(RThread) and params.has_key?(:tags)
        log.action += "Изменены тэги (изначальные: #{@post.tags_aliases.join(", ")})."
        tags = Array.new
        params[:tags].split(' ').each do |al|
          tag = Tag.where(alias: al).first
          if tag == nil
            @response[:errors] << t('errors.content.tags')
            break
          else
            tags << tag
          end
        end
        if @response[:errors].empty?
          @post.tags.clear
          tags.each { |tag| @post.tags << tag }
        end
        clear_cache(@post)
        counters = get_counters
        counters[:post] = @post.jsonify
        CometController.publish('/counters', counters)
      end
    end
    Rails.cache.delete('views/about/modlog')
    if @response[:errors].empty?
      @response[:status] = 'success' 
      log.save
    end
    respond!
  end

  def set_settings
    settings = Settings.get
    defence = settings.defence
    if params[:dyson] == ""
      defence[:dyson] = nil
    else
      defence[:dyson] = params[:dyson].to_sym
    end
    defence[:speed_limits] = {
      tau: params[:speed_limits][:tau].to_i,
      ip: {
        thread: params[:speed_limits][:ip][:thread].to_i,
        post: params[:speed_limits][:ip][:post].to_i,
      },
      captcha: {
        thread: params[:speed_limits][:captcha][:thread].to_i,
        post: params[:speed_limits][:captcha][:post].to_i,
      },
      global: params[:speed_limits][:global].to_i
    }
    spamtxt_enabled = false
    if params[:spamtxt].has_key?(:enabled)
      spamtxt_enabled = true if params[:spamtxt][:enabled] == 'on'
    end
    defence[:spamtxt][:enabled] = spamtxt_enabled
    defence[:spamtxt][:words] = Array.new
    params[:spamtxt][:words].split("\n").each do |word|
      word.strip!
      defence[:spamtxt][:words] << Regexp.new(word) unless word.empty?
    end
    settings.save
    @response[:status] = 'success'
    respond!
  end
end
