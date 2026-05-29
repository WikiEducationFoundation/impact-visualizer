# frozen_string_literal: true
module ApplicationHelper
  MARKDOWN_EXTENSIONS = {
    autolink: true,
    fenced_code_blocks: true,
    tables: true,
    strikethrough: true,
    no_intra_emphasis: true,
    space_after_headers: true
  }.freeze

  MARKDOWN_RENDER_OPTIONS = {
    filter_html: true,
    safe_links_only: true,
    no_styles: true,
    hard_wrap: true,
    link_attributes: { rel: 'noopener noreferrer', target: '_blank' }
  }.freeze

  def render_markdown(text)
    return ''.html_safe if text.blank?

    renderer = Redcarpet::Render::HTML.new(MARKDOWN_RENDER_OPTIONS)
    html = Redcarpet::Markdown.new(renderer, MARKDOWN_EXTENSIONS).render(text.to_s)
    # filter_html + safe_links_only strip raw/unsafe HTML, so the output is safe to mark.
    html.html_safe # rubocop:disable Rails/OutputSafety
  end
end
