# Articles

This list is done with a Twig loop inside a Markdown file:

{% for page in archives %}
- [{{ page.title }}]({{ page.link }})
{% endfor %}

And it can be placed anywhere in the text.
