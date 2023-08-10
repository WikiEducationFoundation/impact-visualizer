# frozen_string_literal: true

module ApiErrorHandling
  def log_error(error, context = nil)
    puts(context) unless context.nil?
    raise error
  end
end
