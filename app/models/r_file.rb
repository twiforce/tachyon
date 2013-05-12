class RFile < ActiveRecord::Base
  has_many :r_threads
  has_many :r_files

  before_destroy do
    if RFile.where(md5_hash: self.md5_hash).count == 1
      begin 
        File.delete("#{Rails.root}/public#{self.url_full}")
        File.delete("#{Rails.root}/public#{self.url_small}")
      rescue
        # don't give a fuck
      end
    end
  end

  def self.validate(params)
    settings = Settings.get
    file = params[:file]
    errors = Array.new
    if file == nil or file.kind_of?(String)
      if (video = params[:video]).empty?
        return nil
      else
        video_id = params[:video].scan(/v=(.{10,12})(\&|\z|$)/)
        video_id = video_id[0] if video_id != nil
        video_id = video_id[0] if video_id != nil
        video_id = 'sosnooley' unless video_id
        url = URI.parse("http://gdata.youtube.com/feeds/api/videos/#{video_id}")
        req = Net::HTTP::Get.new(url.path)
        res = Net::HTTP.start(url.host, url.port) { |http| http.request(req) }
        if ['Invalid id', 'Video not found'].include?(res.body)
          errors << t('errors.bad_video')
        else
          video_info = Hash.from_xml(res.body)
          video_params = {
            video_duration: video_info['entry']['group']['duration']['seconds'].to_i,
            video_title:    video_info['entry']['title'],
            filename:       video_id,
            md5_hash:       Digest::MD5.hexdigest(video_id),
            extension:      'video'
          }
          record = RFile.create(video_params)
          return record
        end
      end
    else
      if file.tempfile.size > settings.max_file_size
        errors << "#{I18n.t('errors.file.size')} #{(settings.max_file_size/1024)/1000} mb."
      end
      unless settings.allowed_file_types.include?(file.content_type)
        errors << I18n.t('errors.file.type')
      end
      return errors unless errors.empty?
      hash = Digest::MD5.hexdigest(file.tempfile.read)
      if (existing = RFile.where(md5_hash: hash).first)
        record = existing.dup
        record.save
        return record
      end
      type = file.content_type.split('/')[1]
      type = 'swf' if type == 'x-shockwave-flash'
      if ['octet-stream', 'x-rar-compressed'].include?(type)
        type = file.original_filename.split('.')[-1] 
      end
      unless %w( png jpeg jpg gif zip rar swf video ).include?(type)
        errors << I18n.t('errors.file.type')
        return errors
      end
      type = 'jpg' if type == 'jpeg'
      path = "#{Rails.root}/public/files"
      Dir::mkdir(path) unless File.directory?(path)
      filename = 'fp7-' + Time.zone.now.to_i.to_s + rand(1..9).to_s
      path += "/#{filename}"
      thumb = "#{path}s.#{type}"
      path += ".#{type}"
      FileUtils.copy(file.tempfile.path, path)
      record_params = { 
        filename:   filename, 
        md5_hash:   hash, 
        extension:  type, 
        size:       file.tempfile.size,
      }
      file_is_picture = false
      begin
        picture = Magick::ImageList.new(path)
        file_is_picture = true if picture
      rescue 
        this_is_pic = false
      end
      if file_is_picture
        animated = (picture.length > 1)
        picture = picture[0]
        record_params[:rows]    = picture.rows
        record_params[:columns] = picture.columns
        if (picture.columns > 200 or picture.rows > 200) or animated
          picture.resize_to_fit!(200, 200) 
          picture.write(thumb)
          record_params[:resized]       = true
          record_params[:thumb_columns] = picture.columns
          record_params[:thumb_rows]    = picture.rows
        end
      else
        record_params[:resized]       = true
        record_params[:thumb_columns] = 128
        record_params[:thumb_rows]    = 128
      end
      record = RFile.create(record_params)
      return record
    end
    return errors
  end

  def picture?
    %w( png jpeg gif jpg bmp ).include?(self.extension)
  end

  def video?
    self.extension == 'video'
  end

  def flash?
    self.extension == 'swf'
  end

  def archive?
    ['zip', 'rar'].include?(self.extension)
  end

  def url_full
    if self.video?
      "http://anonym.to/?http://youtube.com/watch?v=#{self.filename}"
    else
      "/files/#{self.filename}.#{self.extension}"
    end
  end

  def url_small
    if self.picture? and self.resized? 
      "/files/#{self.filename}s.#{self.extension}"
    elsif self.archive?
      "/assets/ui/archive.png"
    elsif self.video?
      "http://i.ytimg.com/vi/#{self.filename}/0.jpg"
    elsif self.flash?
      "/assets/ui/flash.png"
    else
      self.url_full
    end
  end

  def jsonify
    return {
      filename:       self.filename,
      size:           self.size,
      extension:      self.extension,
      url_full:       self.url_full,
      url_small:      self.url_small,
      is_picture:     self.picture?,
      columns:        self.columns,
      rows:           self.rows,
      thumb_rows:     self.thumb_rows,
      thumb_columns:  self.thumb_columns,
      video_duration: self.video_duration,
      video_title:    self.video_title
    }
  end
end
