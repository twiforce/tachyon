class AboutController < ApplicationController
  before_filter do
    @title = t('about')
    return render(layout: nil) if @mobile == false
    return render() if @mobile == true
  end

  def site
  end

  def rules
  end

  def contacts
  end

  def engine
  end

  def faq
  end

  def modlog
  end
end
