# RewriteEngine On

# # Set the base URL path (change according to your directory structure)
# RewriteBase /

# # Preserve Authorization header for PHP
# RewriteCond %{HTTP:Authorization} ^(.*)
# RewriteRule .* - [E=HTTP_AUTHORIZATION:%1]

# # Redirect all requests to index.php except for existing files and directories
# RewriteCond %{REQUEST_FILENAME} !-f
# RewriteCond %{REQUEST_FILENAME} !-d
# RewriteRule ^ index.html [QSA,L]

# # Custom 404 error handling if required
# ErrorDocument 404 /index.html


# # In .htaccess
# <IfModule mod_rewrite.c>
#   RewriteEngine On
#   RewriteBase /
#   RewriteRule ^index\.html$ - [L]
#   RewriteCond %{REQUEST_FILENAME} !-f
#   RewriteCond %{REQUEST_FILENAME} !-d
#   RewriteRule . /index.html [L]
# </IfModule>

<IfModule mod_rewrite.c>
  RewriteEngine On

  # -----------------------------------------------------------------
  # Rule 1: Fix Asset Paths for Subdirectories
  # -----------------------------------------------------------------
  # If a request is made for a file in a subdirectory's assets folder
  # (e.g., /shop/1/assets/main.js) and that file does not exist there...
  RewriteCond %{REQUEST_FILENAME} !-f
  # ...then internally rewrite the request to look for the file in the
  # root /assets/ directory.
  RewriteRule ^[^/]+/assets/(.+)$ /assets/$1 [L]

  # -----------------------------------------------------------------
  # Rule 2: Catch-all for Dynamic Routes
  # -----------------------------------------------------------------
  # If the request is not for an existing file and not for an existing
  # directory (and wasn't handled by the rule above)...
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  # ...serve the main index.html file to let the React Router handle it.
  RewriteRule . /index.html [L]
</IfModule>
# php -- BEGIN cPanel-generated handler, do not edit
# Set the “ea-php81” package as the default “PHP” programming language.
<IfModule mime_module>
  AddHandler application/x-httpd-ea-php81 .php .php8 .phtml
</IfModule>
# php -- END cPanel-generated handler, do not edit