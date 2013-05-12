class AddThreadDeletion < ActiveRecord::Migration
  def change
    add_column :r_threads,   :old,  :boolean
    add_index  :r_threads,   :old,  unique: false
  end
end
