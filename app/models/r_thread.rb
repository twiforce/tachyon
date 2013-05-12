class RThread < ActiveRecord::Base
  has_and_belongs_to_many :tags
  has_many                :r_posts
  has_many                :last_posts, class_name: RPost, order: "id DESC", limit: 6
  belongs_to              :r_file
  belongs_to              :ip
  belongs_to              :defence_token

  serialize :replies_rids, Array
  validates_with TachyonMessageValidator

  before_create do
    self.bump = Time.zone.now
    self.old = false
    self.replies_rids = Array.new
  end

  before_destroy do
    self.r_posts.delete_all
  end

  def self.get_by_rid(rid)
    return self.where(rid: rid).first
  end

  def self.random
    uncached do
      return self.first(order: RANDOM)
    end
  end

  def has_file?
    return (self.r_file_id != nil)
  end

  def tags_aliases
    result = Array.new
    self.tags.each do |tag|
      result << tag.alias
    end
    return result
  end

  def tags_names
    result = Array.new
    self.tags.each do |tag|
      result << tag.name
    end
    return result
  end

  def jsonify(files=nil)
    data = {
        rid:            self.rid,
        message:        self.message,
        title:          self.title,
        replies_rids:   self.replies_rids,
        replies_count:  self.replies_count,
        created_at:     self.created_at,
        old:            self.old,
        posts:          Array.new,
        file:           nil,
        tags:           self.tags_jsonify,
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

  def tags_jsonify 
    result = Array.new
    self.tags.each do |tag|
      result << {alias: tag.alias, name: tag.name}
    end
    return result
  end
end