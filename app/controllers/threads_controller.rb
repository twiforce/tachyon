class ThreadsController < ApplicationController
  before_filter do
    if ['index', 'page'].include?(params[:action])
      if @mobile and params.has_key?(:path)
        return not_found
      else
        get_tag unless @mobile
      end
    end
  end

  def index
    show_page(1)
  end

  def show 
    rid = params[:rid].to_i
    return not_found if rid == 0
    if @mobile 
      cache = Rails.cache.read("views/#{rid}")
      return render(layout: 'application') if cache
    end
    thread_rid = RThread.connection.select_all("SELECT r_threads.rid 
        FROM r_threads WHERE r_threads.rid = #{rid} LIMIT 1")
    if thread_rid.empty?
      return not_found
    else
      data = Rails.cache.read("json/#{rid}/f")
      data = build_thread(rid) unless data
      @response[:thread] = data
    end
    @response[:status] == 'success'
    if @response[:thread][:title] != ''
      @title = @response[:thread][:title].dup
    else
      @title = t('thread') + " ##{rid}"
    end
    respond!
  end

  def show_old 
    redirect_to(action: 'show', rid: params[:rid], only_path: true)
  end

  def page 
    page_number = params[:page].to_i
    page_number = 1 if page_number < 1
    show_page(page_number)
  end

  def create
    process_post 
  end

  def reply
    process_post
  end

  def expand
    if (thread = RThread.get_by_rid(params[:rid].to_i))
      data = Rails.cache.read("json/#{thread.rid}/f")
      data = build_thread(thread.rid) unless data
      @response[:posts] = data[:posts]
    else
      @response[:status] = 'fail'
      @response[:errors] = ['thread not found']
    end
    respond!
  end

  def get_post
    post = RPost.get_by_rid(params[:rid])
    post = RThread.get_by_rid(params[:rid]) unless post
    @response[:post] = post.jsonify if post 
    respond!
  end

  def edit_post
    @response[:status] = 'fail'
    @response[:errors] = Array.new
    @post = RPost.get_by_rid(params[:rid].to_i)
    @post = RThread.get_by_rid(params[:rid].to_i) unless @post
    if @post
      @response[:errors] << t('errors.edit.password') if @post.password != params[:password] 
      @response[:errors] << t('errors.edit.time') if @post.created_at < (Time.zone.now - 5.minutes)
      if @response[:errors].empty?
        @thread = @post.r_thread if @post.kind_of?(RPost)
        @thread = @post if @post.kind_of?(RThread)
        @post.message = parse(params[:text])
        @post.save
        clear_cache(@post)
        counters = get_counters
        counters[:post] = @post.jsonify
        CometController.publish('/counters', counters)
        @response[:status] = 'success'
      end
    else
      @response[:errors] << 'post not found'
    end
    respond!
  end

  def delete_post
    @response[:status] = 'fail'
    @response[:errors] = Array.new
    post = RPost.get_by_rid(params[:rid].to_i)
    post = RThread.get_by_rid(params[:rid].to_i) unless post
    if post
      @response[:errors] << t('errors.edit.password') if post.password != params[:password] 
      @response[:errors] << t('errors.edit.time') if post.created_at < (Time.zone.now - 5.minutes)
      if @response[:errors].empty?
        if params[:file] == 'true'
          post.r_file.destroy
          post.r_file_id = nil
          post.save
        else
          post.destroy
        end
        clear_cache(post)
        counters = get_counters
        if params[:file] == 'true'
          counters[:post] = post.jsonify
        else
          counters[:delete] = post.rid
          counters[:replies] = [@thread.rid, @thread.replies_count]
        end
        CometController.publish('/counters', counters)
        @response[:status] = 'success'
      end
    else
      @response[:errors] << 'post not found'
    end
    respond!
  end

  def live 
    return redirect_to("http://#{@host}/~/") if @mobile == true
    @response[:messages] = Array.new
    threads = RThread.order('created_at DESC').limit(15).to_a
    posts = RPost.order('created_at DESC').limit(15).to_a
    messages = threads + posts
    messages.sort! { |x, y| y.rid <=> x.rid }
    messages = messages[0..14].reverse
    files_ids = Array.new
    messages.each do |message|
      files_ids << message.r_file_id if message.has_file?
    end
    files = RFile.where("r_files.id IN (?)", files_ids).to_a
    messages.each do |message|
      if message.kind_of?(RThread)
        @response[:messages] << message.jsonify(files)
      else
        @response[:messages] << message.jsonify(files, nil, true)
      end
    end
    respond!
  end

  #====================================================================#

  private
  def build_thread(rid)
    minimal = ! ['show', 'expand'].include?(params[:action])
    thread = RThread.get_by_rid(rid)
    if minimal
      posts = thread.last_posts.reverse
      token = 'm' # is for mini
    else
      posts = thread.r_posts
      token = 'f' # is for full
    end
    files_ids = Array.new
    files_ids << thread.r_file_id if thread.has_file?
    posts.each { |post| files_ids << post.r_file_id if post.has_file? }
    files = RFile.where("r_files.id IN (?)", files_ids).to_a
    data = thread.jsonify(files)
    posts.each { |post| data[:posts] << post.jsonify(files, rid) }
    Rails.cache.write("json/#{rid}/#{token}", data)
    return data
  end

  def show_page(page_number)
    @response[:errors] = Array.new
    if @mobile == true
      cache = Rails.cache.read("views/#{params[:tag]}/#{page_number}")
      return render(layout: 'application') if cache
      get_tag
    end
    if params[:order] == 'created_at'
      order = "created_at DESC"
    else
      order = 'bump DESC'
    end
    amount = params[:amount].to_i
    amount = 7 if @mobile
    params[:rids] = [1] unless params.has_key?(:rids)
    if amount < 5 or amount > 20 
      @response[:errors] << 'invalid request'
    end
    if params.has_key?(:hidden_posts)
      if params[:hidden_posts].size > 50
        @response[:errors] << 'invalid request' 
      else
        for i in 0..(params[:hidden_posts].length-1)
          params[:hidden_posts][i] = params[:hidden_posts][i].to_i
        end
      end
    end
    @response[:status] = 'success'
    @response[:threads] = Array.new
    offset = (page_number * amount) - amount
    unless @response[:errors].empty?
      @response[:status] = 'fail'
      return respond!
    end
    if @tag == '~'
      @title = t('overview')
      if params.has_key?(:hidden_tags) or params.has_key?(:hidden_posts)
        hidden_rids = [31337] + params[:hidden_posts].to_a
        hidden_tags = ['otsos'] + params[:hidden_tags].to_a
        Tag.all.each do |tag|
          hidden_rids += tag.r_threads.pluck('r_threads.rid') if hidden_tags.include?(tag.alias)
        end
        # костыли и велосипеды
        thread_rids = RThread.find(:all, select: 'rid', order: order, 
          conditions: ['rid NOT IN (?)', hidden_rids], limit: amount, offset: offset)
        total = RThread.where('rid NOT IN (?)', hidden_rids).count
      else 
        thread_rids = RThread.find(:all, select: 'rid', order: order, limit: amount, offset: offset)
        total = RThread.count
      end
    elsif @tag == 'favorites'
      return redirect_to("http://#{@host}/~/") if @mobile == true 
      total = params[:rids].size
      if total > 50 
        @response = {status: 'fail', errors: ['invalid request']}
        return respond!
      end
      for i in 0..(params[:rids].size-1) 
        params[:rids][i] = params[:rids][i].to_i
      end
      thread_rids = RThread.connection.select_all("SELECT r_threads.rid FROM r_threads
      WHERE r_threads.rid IN (#{params[:rids].join(', ')}) ORDER BY r_threads.#{order} LIMIT #{amount} OFFSET #{offset}")
    else
      return if @tag == nil and @mobile == true
      @title = @tag.name
      if params.has_key?(:hidden_tags) or params.has_key?(:hidden_posts)
        conditions = ["r_threads.rid NOT IN (?) AND tags.id = ?", [1], @tag.id]
        rids = RThread.order(order).joins(:tags).where(conditions).limit(amount).offset(offset).pluck('r_threads.rid')
        thread_rids = Array.new
        rids.each { |rid| thread_rids << {'rid' => rid} }
        total = RThread.joins(:tags).where(conditions).count
      else
        thread_rids = RThread.connection.select_all("SELECT r_threads.rid FROM r_threads
          INNER JOIN r_threads_tags ON r_threads_tags.r_thread_id = r_threads.id 
          INNER JOIN tags ON tags.id = r_threads_tags.tag_id WHERE tags.id = '#{@tag.id}'
          ORDER BY r_threads.#{order} LIMIT #{amount} OFFSET #{offset}")
        total = RThread.order(order).joins(:tags).where("tags.id = ?", @tag.id).count
      end
    end
    thread_rids.each do |hash|
      data = Rails.cache.read("json/#{hash['rid']}/m")
      data = build_thread(hash['rid']) unless data
      @response[:threads] << data
    end
    @response[:pages] = 0
    unless @response[:threads].empty?
      plus = 0
      plus = 1 if (total % amount) > 0
      @response[:pages] = (total / amount) + plus 
    end
    @response[:status] == 'success'
    return render('index') if @mobile == true
    respond!
  end

  def get_tag
    if ['~', 'favorites'].include?(params[:tag])
      @tag = params[:tag]
    else
      @tag = Tag.where(alias: params[:tag]).first
      return not_found if @tag == nil
    end
  end

  def process_post
    def get_password
      if params[:message].has_key?(:password)
        logger.info "\n\n\n"
        logger.info params[:message][:password].inspect
        return params[:message][:password] unless params[:message][:password].empty?
      end
      return (100000000 + rand(1..899999999)).to_s
    end

    def processing_thread?
      @post.kind_of?(RThread)
    end

    def validate_content
      params[:file] = "" unless params.has_key?(:file)
      @post.r_file_id = 0 unless (params[:file].kind_of?(String) and params[:video].empty?)
      if @post.invalid? 
        @post.errors.to_hash.each_value do |array|
          array.each { |error| @response[:errors] << error }
        end
      end
      if @response[:errors].empty? and processing_thread?
        @tags = Array.new
        logger.info params[:tags].inspect
        params[:tags].split(' ').each do |al|
          if (tag = Tag.where(alias: al).first) 
            @tags << tag unless (tag.alias == 'trash' or @tags.include?(tag))
          else
            @response[:errors] << t('errors.content.tags')
            break
          end
        end
        @tags << Tag.where(alias: 'b').first if @tags.empty?
      end
      if @response[:errors].empty?
        file_result = RFile.validate(params)
        if file_result.kind_of?(RFile)
          @post.r_file_id = file_result.id
          @file = file_result
        elsif file_result.kind_of?(Array)
          @response[:errors] += file_result
        else
          @post.r_file_id = nil
        end
      end
      @post.password = get_password
      return @response[:errors].empty?
    end

    def validate_permission
      check_defence_token
      if @token == nil and @settings.defence[:dyson] != :omicron
        set_defence_token
      end
      case @settings.defence[:dyson]
      when :tau
        if processing_thread? and @moder == nil
          if (captcha = Captcha.where(key: session[:captcha]).first)
            unless captcha.defensive == true
              @response[:errors] << t('errors.dyson.tau') 
              set_captcha(true)
              @tau = true
            end
          end
        end
      when :sigma
        @response[:errors] << t('errors.dyson.sigma') if processing_thread?
      when :omicron
        @response[:errors] << t('errors.dyson.omicron') if @token == nil
      end
      return false unless @response[:errors].empty?
      if @ip.banned?
        @response[:errors] << t('errors.banned') + "&laquo;#{@ip.ban.reason}&raquo;."
        return false
      end
      if @settings.defence[:spamtxt][:enabled] == true
        [@post[:message], @post[:password], @ip.address].each do |to_scan|
          @settings.defence[:spamtxt][:words].each do |regexp|
            unless to_scan.scan(regexp).empty?
              @response[:errors] << t('errors.spamtxt')
              return false
            end
          end
        end
      end
      if session[:moder_id] == nil
        if @ip.post_captcha_needed or @settings.defence[:dyson] != nil
          validate_captcha
          @response[:errors] << t('errors.captcha.old') if @captcha == nil
          @response[:errors] << t('errors.captcha.invalid') if @captcha == false
          @ip.post_captcha_needed = false if @captcha == true
        end
      end
      if processing_thread?
        @checking = @ip.last_thread
        limit = @settings.defence[:speed_limits][:ip][:thread]
      else
        @checking = @ip.last_post
        limit = @settings.defence[:speed_limits][:ip][:post]
        if (@thread = RThread.get_by_rid(params[:rid].to_i))
          @post.r_thread_id = @thread.id
        else
          return not_found
        end
      end
      delta = (Time.zone.now - @checking).to_i
      if delta < limit and @moder == nil
        @response[:errors] << t('errors.speed_limit.ip') + Verbose::seconds(limit - delta)
      end
      return @response[:errors].empty?
    end

    get_ip
    @moder = Moder.find(session[:moder_id]) if session[:moder_id] != nil
    @response[:errors] = Array.new
    @settings = Settings.get
    @post = RThread.new(params[:message]) if params[:action] == 'create'
    @post = RPost.new(params[:message]) if params[:action] == 'reply'
    validate_content if validate_permission
    if @response[:errors].empty?
      @post.rid = IdCounter.get_next_rid(processing_thread?)
      @post.ip_id = @ip.id
      @post.message = parse(@post.message)
      @post.defence_token_id = @token.id if @token
      @post.save
      clear_cache(@post)
      if @token 
        if @token.updated_at < (Time.zone.now - 1.day)
          @token.updated_at = @post.created_at
          @token.save
        end
      end
      if processing_thread?
        @tags.each { |tag| @post.tags << tag }
        limit = @settings.defence[:speed_limits][:captcha][:thread]
        post_json = @post.jsonify([@file])
        Rails.cache.write("json/#{@post.rid}/f", post_json)
        Rails.cache.write("json/#{@post.rid}/m", post_json)
        @response[:thread_rid] = @post.rid
        now = Time.zone.now
        start_of_hour = Time.new(now.year, now.month, now.day, now.hour)
        threads_per_hour = RThread.where(created_at: start_of_hour..now).count
        if threads_per_hour > @settings.defence[:speed_limits][:tau]
          @settings.defence[:dyson] = :tau
          @settings.save
        end
      else
        @thread.replies_count += 1
        if (@settings.bump_limit > @thread.replies_count) and @post.sage == false
          @thread.bump = Time.zone.now 
          @thread.old = false
        end
        @thread.save
        limit = @settings.defence[:speed_limits][:captcha][:post]
        post_json = @post.jsonify([@file], @thread.rid, true)
        if params.has_key?(:returnpost) 
          @response[:post] = post_json 
        else
          @response[:post_rid] = @post.rid
        end
      end
      old_ids = RThread.order('bump DESC').offset(@settings.max_threads).pluck('r_threads.id')
      RThread.where("r_threads.id IN (?)", old_ids).update_all(old: true)
      CometController.publish('/live', post_json)
      counters = get_counters
      unless processing_thread?
        counters[:replies] = [@thread.rid, @thread.replies_count] 
        CometController.publish("/thread/#{@thread.rid}", post_json)
      end
      CometController.publish('/counters', counters)
      delta = Time.zone.now - @checking
      @ip.post_captcha_needed = true if delta.to_i < limit
      @response[:status] = 'success'
      @response[:password] = @post.password
      @ip.update_last(@post)
    end
    @response[:status] = 'fail' unless @response[:errors].empty?
    @ip.post_captcha_needed = true if @settings.defence[:dyson] != nil
    set_captcha if @ip.post_captcha_needed and session[:moder_id] == nil
    logger.info @response.inspect
    respond!
  end
end
