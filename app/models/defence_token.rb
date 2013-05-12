class DefenceToken < ActiveRecord::Base
  has_many :r_threads
  has_many :r_posts

  before_create do
    procceed = true
    while procceed 
      id = rand(999999999).to_s
      self.hashname = Digest::MD5.hexdigest(id)
      existing = DefenceToken.where(hashname: self.hashname).first
      procceed = false unless existing
    end
  end
end
