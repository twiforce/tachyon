start         = Time.now
date          = "-#{Time.now.month}-#{Time.now.year}"
engine_path   = "/srv/tachyon/engine"
backups_path  = "/srv/tachyon/backups"

unless File.directory?(backups_path)
  puts "Creating backups directory..."
  Dir::mkdir(backups_path)
end
unless File.directory?(backups_path + '/database')
  puts "Creating backups/database directory..."
  Dir::mkdir(backups_path + '/database')
end
unless File.directory?(backups_path + '/files')
  puts "Creating backups/files directory..."
  Dir::mkdir(backups_path + '/files')
end

old = Time.now - 3*86400
old = "#{old.day}-#{old.month}-#{old.year}"
if File.directory?("#{backups_path}/files/#{old}")
  puts "Removing old files backup..."
  system "rm -r #{backups_path}/files/#{old}"
end
if File.exists?("#{backups_path}/database/#{old}.mysql2")
  puts "Removing old database backup..."
  system "rm -r #{backups_path}/database/#{old}.mysql2"
end

today = "#{Time.now.day}#{date}"
if File.directory?("#{backups_path}/files/#{today}")
  puts "Recent files backup already exists."
else
  puts "Copying files..."
  system "cp -r #{engine_path}/public/files #{backups_path}/files/#{today}"
end
if File.exists?("#{backups_path}/database/#{today}.mysql2")
  puts "Recent database backup already exists."
else
  puts "Stopping Thin server..."
  system "thin -C #{engine_path}/config/thin.yml stop"
  puts "Copying database..."
  system "mysqldump -utrent -prosenkristall freeport7 > #{backups_path}/database/#{today}.mysql2"
  puts "Starting Thin server..."
  system "thin -C #{engine_path}/config/thin.yml start"
end

puts
puts "Backup finished in #{(Time.now - start).to_i} seconds."