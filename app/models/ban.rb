class Ban < ActiveRecord::Base
  belongs_to :ip

  validates_presence_of :expires
  
  before_create do 
    if (old_ban = self.ip.ban)
      old_ban.delete
    end
  end
end
