class Tag < ActiveRecord::Base
  has_and_belongs_to_many :r_threads

  def to_s
    return self.alias
  end
end
