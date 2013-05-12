# coding: utf-8

module Verbose
  def self.seconds(amount)
    result = "#{amount} секунд"
    amount_mod = amount %  10
    if (2..4).include?(amount_mod) and not (12..14).include?(amount % 100)
      result + 'ы.' 
    elsif amount_mod != 1 or amount == 11
      result + '.'
    else
      result + 'у.'
    end
  end

  def self.date(date, show_time=true)
    months = [  'января',   'февраля',    'марта',
                'апреля',   'мая',        'июня',
                'июля',     'августа',    'сентября',
                'октября',  'ноября',     'декабря'    ]
    now = Time.now.getlocal
    date = date.getlocal  
    result = "#{date.day} #{months[date.month - 1]} #{date.year} г."
    if now.day == date.day
      result = 'сегодня ' if [now.month, now.year] == [date.month, date.year]
    elsif date.day == (now.day - 1)
      result = 'вчера ' if [now.month, now.year] == [date.month, date.year]
    end
    result += ' в ' + date.strftime('%H:%M:%S') if show_time
    return result
  end

  def self.omitted(number)
    result = "#{number} пост"
    number_mod = number % 10
    if (2..4).include?(number_mod) and not (12..14).include?(number % 100)
      result += 'а' 
    elsif number_mod != 1 or number == 11
      result += 'ов'
    end
    result + ' спустя:'
  end
end