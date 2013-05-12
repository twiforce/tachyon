# coding: utf-8

class TachyonMessageValidator < ActiveModel::Validator
  def validate(record)
    record.errors[:message] << I18n.t('errors.content.long_message') if record.message.length > 5000
    record.errors[:title] << I18n.t('errors.content.long_title') if record.title.length > 60
    # record.errors[:password] << I18n.t('errors.password_too_long') if record.password.length > 100
    regexp = /(\w|[й,ц,у,к,е,н,г,ш,щ,з,х,ъ,ф,ы,в,а,п,р,о,л,д,ж,э,я,ч,с,м,и,т,ь,б,ю])+/
    message_present = !record.message.scan(regexp).empty?

    if message_present or record.has_file?
      if record.kind_of?(RThread)  
        record.errors[:base] << I18n.t('errors.content.no_message') unless message_present
        if record.new_record?
          record.errors[:base] << I18n.t('errors.content.no_file') unless record.has_file? 
        end
      end
    else
      record.errors[:base] << I18n.t('errors.content.no_content') 
    end
  end
end

class RPost < ActiveRecord::Base
  belongs_to  :r_thread
  belongs_to  :r_file
  belongs_to  :ip
  belongs_to  :defence_token

  serialize :replies_rids, Array
  validates_with TachyonMessageValidator

  before_destroy do
    if (thread = self.r_thread)
      if thread.replies_count > 1
        thread.bump = thread.r_posts.offset(thread.replies_count-2).limit(1).first.created_at
      else 
        thread.bump = thread.created_at
      end
      thread.replies_count -= 1
      thread.save
    end
    self.r_file.destroy if self.has_file?
    regexp = /<div class="|'(post_link|proofmark)"|'><a href="|'\/thread\/\d+#i\d+"|'>(&gt;&gt;|##)?(\d+)?<\/a><\/div>/
    self.message.scan(regexp).each do |link|
      post = RPost.where(rid: link[2].to_i).first
      post = RThread.where(rid: link[2].to_i).first unless post
      if post
        post.replies_rids.each do |hash|
          post.replies_rids.delete(hash) if hash[:post] == self.rid
        end
        post.save
      end
    end
  end

  def self.get_by_rid(rid)
    return self.where(rid: rid).first
  end

  def has_file?
    return (self.r_file_id != nil)
  end

  def jsonify(files=nil, thread_rid=nil, thread_title=nil)
    if thread_rid == nil or thread_title == true
      @thread = self.r_thread
      thread_rid = @thread.rid
      thread_title = @thread.title
      thread_title = @thread.message if @thread.title.empty?
    end
    if thread_title != nil and thread_title != false 
      thread_title.gsub!(/<.+?>/, ' ')
      thread_title.gsub!('  ', ' ')
      thread_title.strip!
      thread_title = thread_title[0..43] + "..." if thread_title.length > 45
    end
    data = {
      rid:            self.rid,
      message:        self.message,
      title:          self.title,
      replies_rids:   self.replies_rids,
      sage:           self.sage,
      thread_rid:     thread_rid,
      thread_title:   thread_title,
      created_at:     self.created_at,
      file:           nil,
    }
    if self.has_file?
      if files == nil
        data[:file] = self.r_file.jsonify
      else
        files.each do |file|
          if file.id == self.r_file_id
            data[:file] = file.jsonify
            break
          end
        end
      end
    end
    return data
  end
end