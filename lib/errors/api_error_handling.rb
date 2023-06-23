# frozen_string_literal: true

module ApiErrorHandling
  def log_error(error)
    Rails.logger.info "Caught #{error}"
    return nil
  end
end
