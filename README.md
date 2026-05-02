instructions for use:

1. setting up database
- open xampp. start apache and mysql
- click the admin button at the right side of mysql's start button. alternatively, go to http://localhost/phpmyadmin/ on your browser
- create a new database named "citcreds1" without the double quotes and then open it
- navigate to the top bar and find the import button.
- on the "file to import" section, upload setup.sql. this file will create the necessary tables along with existing users and products
- after uploading, scroll down to the bottom and click import


2. setting up site
- in your file explorer, move the canteensys folder inside C:\xampp\htdocs
- open your browser and go to http://localhost/canteensys/index.html

default passwords for students and teachers: password123
ex. Ben Santos, password123

authentication for canteen staff:
User: Canteen Staff
Password: password


**TODO**
  1. [DONE] ~~login register user authentication frontend~~
  2. [DONE] ~~login register user authentication backend~~
  3. [DONE] ~~user balance display~~
  4. [WIP] ERD stuff
  5. [WIP] text polishing sa site, like changing the "Canteen System" text to CITCreds and stuff. 
  6. [DONE] ~~user interface for students and teachers~~
  7. [WIP] implement search feature instead of scrolling down for every user when charging users
  8. [WIP] Remove emojis when charging users
  9. [WIP] update figma(?? do we have to update figma...)
  10. [WIP] find bugs and fix
  11. [WIP] Split index.html into different html files (student dashboard, canteen staff dashboard, teacher dashboard)
