class CreateIdCounters < ActiveRecord::Migration
  def change
    create_table :id_counters do |t|
      t.integer   :last_rid,        default: 0
      t.integer   :total_threads,   default: 0
      t.integer   :total_posts,     default: 0

      t.timestamps
    end
  end
end
