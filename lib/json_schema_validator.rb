# frozen_string_literal: true
require 'json-schema'

class JsonSchemaValidator < ActiveModel::EachValidator
  def validate_each(record, attribute, value)
    # Looks for a JSON schema as a class constant
    c = "#{attribute.upcase}_SCHEMA"
    begin
      schema = record.class.const_get(c)
    rescue NameError => e
      # re-raise exception with a more descriptive message
      raise(
        $!,
        "Expected #{record.class.name}::#{c} to declare a JSON Schema for #{attribute}",
        $!.backtrace
      )
    end
    unless JSON::Validator.validate(schema, value, strict: false, validate_schema: true)

      errors = JSON::Validator.fully_validate(schema, value, strict: false,
                                              validate_schema: true, errors_as_objects: true)
      error_messages = errors.pluck(:message)

      record.errors.add(attribute, "does not comply to JSON Schema: #{error_messages.join(', ')}")
    end
  end
end
