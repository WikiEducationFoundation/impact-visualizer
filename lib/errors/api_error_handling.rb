# frozen_string_literal: true

module ApiErrorHandling
  def log_error(error)
    raise error unless Rails.env.production?
    Rails.logger.info "Caught #{error}"
    return nil
  end
end
