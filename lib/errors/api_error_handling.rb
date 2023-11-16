# frozen_string_literal: true

module ApiErrorHandling
  def log_error(error, context = nil, raise = true)
    puts(context) unless context.nil?
    raise error if raise
  end
end
