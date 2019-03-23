# Articles

Cette liste est faite avec une boucle Twig loop dans le fichier Markdown:

{% for page in archives %}
- [{{ page.title }}]({{ page.link }})
{% endfor %}

Et elle peut être placée n'importe où dans le texte.