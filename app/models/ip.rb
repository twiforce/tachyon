class Ip < ActiveRecord::Base
  has_many  :r_threads
  has_many  :r_posts
  has_many  :r_files
  has_one   :ban

  def self.get(address)
    unless (ip = Ip.where(address: address).first)
      ip = Ip.create({
        address:     address,
        last_thread: Time.zone.now - 10.minutes,
        last_post:   Time.zone.now - 10.minutes,
        post_captcha_needed: true, 
      })
    end
    return ip
  end

  def banned?
    if (ban = self.ban)
      if Time.zone.now > ban.expires
        ban.destroy
        return false
      end
      return true
    end
    return false
  end

  def update_last(post)
    if post.kind_of?(RPost)
      self.last_post = post.created_at
    else
      self.last_thread = post.created_at
    end
    self.save
  end

  def ban_ip(reason, expiration_date, moder_id)
    Ban.create({
      reason:   reason,
      expires:  expiration_date, 
      ip_id:    self.id,
      level:    1,
      moder_id: moder_id
    })
  end
end
