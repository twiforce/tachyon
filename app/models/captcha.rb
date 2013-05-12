# coding: utf-8

class Captcha < ActiveRecord::Base
  validates_presence_of     :key, :word
  
  before_create do 
    old_captcha.destroy if (old_captcha = Captcha.where(key: self.key).first)
    old_captcha.destroy if (old_captcha = Captcha.where(word: self.word).first)
    self.generate_image
  end

  before_destroy do
    begin
      File.delete("#{Rails.root}/public/captcha/#{self.key}.png")
    rescue
      # don't give a fuck
    end
  end

  def self.get_word(cancer=false)
    if cancer
      words = [
        ['ху',     %w( йня ета ец ёк ита ищще ево евый й якс йнул )],
        ['пост',   %w( ы им  ил )],
        ['тред',   ['ы', '']],
        ['борд',   %w( ы а )],
        ['бан',    %w( ы ил  им или )],
        ['вин',    %w( ы ный ищще отА рар же )],
        ['фейл',   %w( ил  овый ишь ю им ед )],
        ['анон',   %w( ы  чик чики им имы имус имусы )],
        ['сосн',   %w( у увшим ешь ули ул улей ицкий и )],
        ['двач',   %w( ер  еры и ру ую уем евал евать )],
        ['бамп',   %w( ы  аю аем ну нул нем нут нутый )],
        ['быдл',   %w( а о обыдло ина ан ецо )],
        ['говн',   %w( ы а о ина ецо апоешь )],
        ['нульч',  %w( ер  еры ую ан )],
        ['педал',  %w( и ик ьный ьчан )],
        ['петуш',  %w( ок ки ня ила )],
        ['школ',   %w( ьник ьники ота отень яр яры )],
        ['слоу',   %w( пок  бро кинг )],
        ['ра',     %w( к ки чки чок ковый )],
        ['суп',    %w( ец б )],
        ['форс',   %w( ед  едмем ил или им ят ер )],
        ['са',     %w( жа гАю жАскрыл ге гануть жица )],
        ['вайп',   %w( ер  алка ы ну нуть нули нутый ают али нут )],
        ['ло',     %w( ли л лд ло ик лоло )],
        ['лигион', %w( ер еры   )],
        ['набе',   %w( г ги гаем жали )],
        ['лепр',   %w( а оеб )],
        ['илит',   %w( а ка ный )],
        ['ньюфа',  %w( г ги жек жина жный )],
        ['олдфа',  %w( г ги жек жина жный )],
        ['шлю',    %w( ха хи шка шки хиненужны )],
        ['пизд',   %w( а ец атый ато уй )],
        ['кукло',  %w( еб ебы бляди )],
        ['',       %w( опхуй десу ормт кококо пони пошелвон кинцо новэй груша цэпэ )],
        ['',       %w( безногим анома номад пистон атятя зой викентий вакаба )],
        ['',       %w( омикрон фрипорт мудрец капча сейдж ололо пахом параша )],
        ['',       %w( номадница игортонет игорнет ногаемс ногамес ноугеймс форчан )],
        ['',       %w( бугурт бомбануло баттхерт бутхурт багет пека йоба схб )],
        ['',       %w( инвайт вечервхату сгущенка пригорело пукан пердак пердачелло )],
        ['',       %w( рулетка деанон дионон кулстори хлебушек блогистан тыхуй )],
        ['',       %w( омск гитлер хохлы анимеговно двощ двощер двощи петух очко очкопетух)],
        ['',       %w( шишка братишка поехавший лишнийствол удафком подтирач )],
        ['',       %w( хачи трубашатал ненависть рейдж алсо посаны ролл сладкийхлеб )],
        ['',       %w( малаца батя зделоли графон дрейкфейс короли джаббер писечка )],
        ['',       %w( номадница пативэн свиборг корован трент фрилансер кровь кишки )],
        ['',       %w( всесоснули сосач макака абу моча мочан уебывай съеби трололо колчан )],
        ['',       %w( пекацефал мыльцо тян тня розенмейден октокот хикка харкач калчан )]
      ]
      word = words[rand(0..words.length-1)]
      word = word[0] + word[1][rand(0..word[1].length-1)]
    else
      # letters = %w( ё й ц у к е н г ш щ з х ъ ф ы в а п р о л д ж э )
      # letters += %w( я ч с м и т ь б ю )
      letters = %w( щ з х ъ ш ж э ю ь ё й ф я ц ы ч )
      word = String.new
      6.times do
        word += letters[rand(0..letters.length) - 1]
      end
    end
    return word
  end

  def self.get_key(defence)
    if (record = Captcha.where(defensive: defence).first(order: RANDOM))
      time_passed = Time.zone.now - record.created_at
      if time_passed > 10.minutes and time_passed < 20.minutes
        record.created_at = Time.zone.now
        record.save
        return record.key
      elsif time_passed > 20.minutes
        Captcha.where("created_at < ?", (Time.zone.now - 20.minutes)).destroy_all
      end
    end
    if defence == true
      word = String.new
      4.times do 
        word += Captcha.get_word
      end
    else
      word = Captcha.get_word(cancer: true)
    end
    key = 100000000 + rand(899999999)
    record = Captcha.create(word: word, key: key, defensive: defence)
    return record.key
  end 

  def self.validate(hash)
    if (captcha = Captcha.where(key: hash[:challenge]).first)
      if (Time.zone.now - captcha.created_at) < 20.minutes
        word = hash[:response].to_s.mb_chars.downcase.gsub("\n", '').gsub(' ', '')
        captcha.word = captcha.word.mb_chars.downcase.gsub("\n", '').gsub(' ', '')
        captcha.destroy
        return (word == captcha.word)
      end
    end
    captcha.destroy if captcha
    return nil
  end

  def generate_image
    path = "#{Rails.root}/public/captcha"
    Dir::mkdir(path) unless File.directory?(path)
    captcha_word = self.word
    rows = captcha_word.scan(/\n/).size
    rows = 1 if rows == 0
    image = Magick::Image.new((captcha_word.length*19+rand(-5..5))/rows, 30*rows) {
      self.background_color = 'transparent'
    }
    iterator    = 0
    offset      = -10
    last_symbol = String.new
    current_row = 1
    while iterator < captcha_word.length
      if captcha_word[iterator] == "\n"
        iterator    += 1
        current_row += 1
        offset      = -10
        next
      end
      offset    += 15
      offset    += 6 if ['ж', 'щ', 'ш', 'ф', 'м', 'ю'].include?(last_symbol)
      bigs_ones = 'А.Е.И.О.У.Э.Ю.Я.Б.В.Г.Д.Ж.З.Й.К.Л.М.Н.П.Р.С.Т.Ф.Х.Ц.Ч.Ш.Щ'.split('.')
      pointsize = 24 + rand(0..4)
      pointsize = 22 + rand(0..8) if self.defensive
      letter    = captcha_word[iterator]
      letter    = letter.mb_chars.upcase if rand(9) > 4
      pointsize = 19 + rand(0..5) if bigs_ones.include?(letter)
      random    = (rand(0..10) > 5)
      p         = 1
      p         += 0.7 if self.defensive
      image.annotate(Magick::Draw.new, 0, 0, offset, -10+30*current_row, letter) {
        self.font_family    = ['Times New Roman', 'Consolas', 'Trebuchet', 'Verdana', 'Georgia', ][rand(0..4)]
        self.fill           = "##{(60 + rand(39)).to_s * 3}"
        self.pointsize      = pointsize
        self.gravity        = Magick::SouthGravity
        self.align          = Magick::LeftAlign
        self.text_antialias = true
        self.rotation       = rand(-20*p..-10*p) if random
        self.rotation       = rand(10*p..20*p) unless random
      }
      last_symbol = captcha_word[iterator]
      iterator += 1
    end
    # image = image.add_noise(Magick::PoissonNoise)
    image.format  = 'PNG'
    degree        = rand(9..16)
    degree        -= degree * 2 if rand(10) > 5
    image         = image.swirl(degree) unless self.defensive
    image.write("#{path}/#{self.key}.png")
  end
end
