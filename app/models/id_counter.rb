class IdCounter < ActiveRecord::Base
  def self.get_next_rid(thread=true)
    record = IdCounter.create unless (record = IdCounter.first)
    if thread
      record.total_threads += 1
    else
      record.total_posts += 1
    end
    record.last_rid += 1
    record.save
    return record.last_rid
  end
end
