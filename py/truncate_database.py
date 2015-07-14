import MySQLdb

# Connect to database
db = MySQLdb.connect(host="localhost", # your host, usually localhost
                     user="root", # your username
                      passwd="root", # your password
                      db="atlas") # name of the data base

cur = db.cursor()

# Clear database
cur.execute("TRUNCATE TABLE images")
cur.execute("TRUNCATE TABLE regions")
print "Database cleared."

db.commit()
cur.close()
db.close()