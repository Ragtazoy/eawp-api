const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
const mysql = require('mysql2')
app.use(cors())
app.use(bodyParser.json())

//==================================================================================================================================================//
// Notification 
//==================================================================================================================================================//
const admin = require('firebase-admin');
const serviceAccount = require('./eawp-66-firebase-adminsdk-7mg2q-8669390c8e.json');
admin.initializeApp({
   credential: admin.credential.cert(serviceAccount),
});

app.post('/send-notification', (req, res) => {
   const { deviceToken, notification, data } = req.body;
   const message = {
      token: deviceToken,
      notification: notification,
      data: data
   };
   admin.messaging().send(message)
      .then((response) => {
         res.send(response);
      })
      .catch((error) => {
         res.status(500).send(error);
      });
});

const db = mysql.createConnection({
   host: '127.0.0.1',
   user: 'root',
   database: 'eawp_base'
});

//==================================================================================================================================================//
// Read 
//==================================================================================================================================================//
app.get('/read/login/:id', (req, res) => {
   const id = req.params.id
   db.query("SELECT nname, password FROM employee WHERE emp_id = ?", [id],
      (err, results) => {
         err ? console.log('/read/login/:id ' + err) : res.json(results[0])
      }
   );
})

app.get('/read/emplist', (req, res) => {
   db.query("SELECT e.emp_id, e.nname, e.password, e.fname, e.lname, e.job_title, e.job_start, e.phone, e.birthdate, e.line_account, w.job_hours, w.absent_quantity, w.late_quantity, w.leave_quantity, (SELECT GROUP_CONCAT(d.dept_name SEPARATOR ', ') FROM department d WHERE d.emp_id = e.emp_id) as dept FROM employee e JOIN work_history w ON e.emp_id = w.emp_id",
      (err, results) => {
         err ? console.log('/read/emplist ' + err) : res.json(results)
      }
   );
})

app.get('/read/dept', (req, res) => {
   db.query('SELECT * FROM department',
      (err, results) => {
         err ? console.log('/read/dept ' + err) : res.json(results)
      }
   );
})

app.get('/read/empdept', (req, res) => {
   db.query('SELECT e.emp_id ,e.nname, e.job_title, d.dept_name FROM employee e JOIN department d WHERE e.emp_id = d.emp_id',
      (err, results) => {
         err ? console.log('/read/empdept ' + err) : res.json(results)
      }
   );
})

app.get('/read/work_schedule', (req, res) => {
   const sched_date = req.query.sched_date
   db.query("SELECT * FROM work_schedule WHERE sched_date = ?",
      [sched_date],
      (err, results) => {
         err ? console.log('/read/work_schedule ' + err) : res.json(results[0])
      }
   );
})

app.get('/read/dept/:id', (req, res) => {
   const id = req.params.id
   db.query('SELECT d.dept_name FROM employee e JOIN department d ON e.emp_id = d.emp_id WHERE e.emp_id = ?', [id],
      (err, results) => {
         err ? console.log('/read/dept/:id ' + err) : res.json(results)
      }
   );
})

app.get('/read/empdetail/:id', (req, res) => {
   const id = req.params.id
   db.query(
      "SELECT *, (SELECT GROUP_CONCAT(d.dept_name SEPARATOR ', ') FROM department d WHERE e.emp_id = d.emp_id) AS dept FROM employee e JOIN work_history w ON e.emp_id = w.emp_id WHERE e.emp_id = ?",
      [id],
      (err, results) => {
         err ? console.log('/read/empdetail/:id ' + err) : res.json(results[0])
      }
   );
})

app.get('/read/count_emp_by_job_title', (req, res) => {
   db.query("SELECT (SELECT COUNT(*) FROM employee WHERE job_title = 'full-time') AS 'full-time', (SELECT COUNT(*) FROM employee WHERE job_title = 'part-time') AS 'part-time' FROM dual",
      (err, results) => {
         err ? console.log('/read/count_emp_by_job_title ' + err) : res.json(results[0])
      }
   );
})

app.get('/read/count_emp_in_scheduling', (req, res) => {
   const sched_date = req.query.sched_date
   db.query("SELECT sched_id, COUNT(*) AS count_emp FROM scheduling WHERE sched_id = (SELECT sched_id FROM work_schedule WHERE sched_date = ?)",
      [sched_date],
      (err, results) => {
         err ? console.log('/read/count_emp_in_scheduling ' + err) : res.json(results[0])
      }
   );
})

app.get('/read/emp_in_scheduling', (req, res) => {
   const sched_date = req.query.sched_date
   db.query("SELECT *, (SELECT e.nname FROM employee e WHERE e.emp_id = s.emp_id) AS nname FROM scheduling s WHERE s.sched_id = (SELECT w.sched_id FROM work_schedule w WHERE w.sched_date = ?)",
      [sched_date],
      (err, results) => {
         err ? console.log('/read/emp_in_scheduling ' + err) : res.json(results)
      }
   );
})

app.get('/read/a_emp_in_scheduling', (req, res) => {
   const emp_id = req.query.emp_id
   const sched_date = req.query.sched_date
   db.query("SELECT s.*, w.sched_date, (SELECT e.nname FROM employee e WHERE e.emp_id = s.emp_id) AS nname FROM scheduling s JOIN work_schedule w ON w.sched_id = s.sched_id WHERE s.emp_id = ? AND w.sched_date = ?",
      [emp_id, sched_date],
      (err, results) => {
         err ? console.log('/read/emp_in_scheduling ' + err) : res.json(results[0])
      }
   );
})

app.get('/read/work_attendance', (req, res) => {
   const sched_id = req.query.sched_id
   db.query("SELECT * FROM work_attendance WHERE sched_id = ?", [sched_id],
      (err, results) => {
         err ? console.log('/read/work_attendance ' + err) : res.json(results)
      }
   );
})

app.get('/read/a_emp_in_multi_scheduling', (req, res) => {
   const emp_id = req.query.emp_id
   const date_start = req.query.date_start
   const date_end = req.query.date_end
   db.query("SELECT s.*, w.sched_date, e.work_exchange_id, (SELECT e.nname FROM employee e WHERE e.emp_id = s.emp_id) AS nname FROM scheduling s JOIN work_schedule w ON s.sched_id = w.sched_id LEFT JOIN work_exchange e ON s.scheduling_id = e.scheduling_id WHERE s.emp_id = ? AND s.sched_id IN (SELECT w.sched_id FROM work_schedule w WHERE w.sched_date BETWEEN ? AND ?) ORDER BY w.sched_date",
      [emp_id, date_start, date_end],
      (err, results) => {
         err ? console.log('/read/a_emp_in_multi_scheduling ' + err) : res.json(results)
      }
   );
})

app.get('/read/payment_history', (req, res) => {
   const sched_date = req.query.sched_date
   db.query("SELECT p.*, e.nname, e.job_title, (SELECT GROUP_CONCAT(d.dept_name SEPARATOR ', ') FROM department d WHERE d.emp_id = p.emp_id) as dept FROM payment_history p JOIN employee e ON e.emp_id = p.emp_id WHERE sched_id = (SELECT sched_id FROM work_schedule WHERE sched_date = ?) ORDER BY p.emp_id",
      [sched_date],
      (err, results) => {
         err ? console.log('/read/payment_history ' + err) : res.json(results)
      }
   );
})

app.get('/read/sum_wage', (req, res) => {
   const date_from = req.query.date_from
   const date_to = req.query.date_to
   db.query("SELECT SUM(p.wage) sum_wage FROM payment_history p WHERE p.sched_id IN (SELECT w.sched_id FROM work_schedule w WHERE w.sched_date BETWEEN ? AND ?)",
      [date_from, date_to],
      (err, results) => {
         err ? console.log('/read/sum_wage ' + err) : res.json(results[0])
      }
   );
})

app.get('/read/work_history', (req, res) => {
   db.query("SELECT w.*, e.nname, e.job_title, (SELECT GROUP_CONCAT(d.dept_name SEPARATOR ', ') FROM department d WHERE d.emp_id = w.emp_id) as dept FROM work_history w JOIN employee e ON e.emp_id = w.emp_id WHERE e.job_title NOT IN ('manager') ORDER BY w.absent_quantity DESC",
      (err, results) => {
         err ? console.log('/read/work_history ' + err) : res.json(results)
      }
   );
})

app.get('/read/sum_work_history', (req, res) => {
   db.query("SELECT SUM(w.absent_quantity) sum_absent, SUM(w.late_quantity) sum_late, SUM(w.leave_quantity) sum_leave FROM work_history w",
      (err, results) => {
         err ? console.log('/read/sum_work_history ' + err) : res.json(results[0])
      }
   );
})

app.get('/read/exchange/device_token', (req, res) => {
   const scheduling_id = req.query.scheduling_id
   db.query("SELECT device_token FROM employee WHERE emp_id = (SELECT s.emp_id FROM scheduling s WHERE scheduling_id = ?)",
      [scheduling_id],
      (err, results) => {
         err ? console.log('/read/exchange/device_token ' + err) : res.json(results[0])
      }
   );
})

app.get('/read/manager/device_token', (req, res) => {
   db.query("SELECT device_token FROM employee WHERE job_title = 'part-time' AND device_token IS NOT null",
      (err, results) => {
         err ? console.log('/read/manager/device_token ' + err) : res.json(results)
      }
   );
})

app.get('/read/notification/exchange', (req, res) => {
   const emp_id = req.query.emp_id
   const today = req.query.today
   db.query("SELECT we.*, (SELECT nname FROM employee WHERE emp_id = s.emp_id) AS nname, ws.sched_date AS exchange_date FROM work_exchange we JOIN scheduling s ON s.scheduling_id = we.exchange_scheduling_id JOIN work_schedule ws ON ws.sched_id = s.sched_id WHERE s.emp_id = ? AND we.wait_date > ?",
      [emp_id, today],
      (err, results) => {
         err ? console.log('/read/notification/exchange ' + err) : res.json(results)
      }
   );
})

app.get('/read/notification/admin', (req, res) => {
   db.query("SELECT * FROM notification ORDER BY notification_date DESC",
      (err, results) => {
         err ? console.log('/read/notification/admin ' + err) : res.json(results)
      }
   );
})

app.get('/read/evaluate', (req, res) => {
   const evaluate_date = req.query.evaluate_date
   db.query("SELECT e.*, emp.nname, emp.job_title, (SELECT GROUP_CONCAT(d.dept_name SEPARATOR ', ') FROM department d WHERE e.emp_id = d.emp_id) AS dept FROM employee emp JOIN evaluate e ON e.emp_id = emp.emp_id WHERE e.evaluate_date = ? AND emp.job_title != 'manager'",
      [evaluate_date],
      (err, results) => {
         err ? console.log('/read/evaluate ' + err) : res.json(results)
      }
   );
})

app.get('/read/a_evaluate', (req, res) => {
   const { emp_id, date_from, date_to } = req.query
   db.query("SELECT * FROM evaluate WHERE emp_id = ? AND evaluate_date BETWEEN ? AND ?",
      [emp_id, date_from, date_to],
      (err, results) => {
         err ? console.log('/read/a_evaluate ' + err) : res.json(results[0])
      }
   );
})

//==================================================================================================================================================//
// Create //
//==================================================================================================================================================//

app.post('/login', (req, res) => {
   const username = req.body.username
   const password = req.body.password
   db.query('SELECT * FROM employee WHERE nname = ? AND password = ?', [username, password],
      (err, results) => {
         if (err) {
            res.json({
               success: false,
               message: 'there are some error with query'
            })
         } else {
            if (results.length > 0) {
               res.json({
                  success: true,
                  message: 'successful login',
                  id: results[0].emp_id,
                  role: results[0].job_title
               })
            } else {
               res.json({
                  success: false,
                  message: 'Username or password is incorrect'
               })
            }
         }
      }
   );
})

app.post('/create/emp', (req, res) => {
   const nname = req.body.nname
   const password = req.body.password
   const job_title = req.body.job_title
   const job_start = req.body.job_start
   const fname = req.body.fname
   const lname = req.body.lname
   const birthdate = req.body.birthdate
   const phone = req.body.phone
   const line_account = req.body.line_account

   db.query(
      "INSERT INTO employee(emp_id, line_account, password, fname, lname, nname, phone, job_title, job_start, birthdate) VALUES (NULL,?,?,?,?,?,?,?,?,?)",
      [line_account, password, fname, lname, nname, phone, job_title, job_start, birthdate],
      (err, results) => {
         err ? console.log('/create/emp ' + err) : res.send(results)
      })
});

app.post('/create/dept', (req, res) => {
   const dept_name = req.body.dept_name
   db.query('INSERT INTO department (emp_id, dept_name) VALUES ((SELECT MAX(emp_id) FROM employee), ?)', [dept_name],
      (err, results) => {
         err ? console.log('/create/dept ' + err) : res.send(results)
      })
});

app.post('/create/work_history', (req, res) => {
   db.query('INSERT INTO work_history (emp_id) VALUES ((SELECT MAX(emp_id) FROM employee))',
      (err, results) => {
         err ? console.log('/create/work_history ' + err) : res.send(results)
      })
});

app.post('/create/evaluate', (req, res) => {
   const { emp_id, score } = req.body
   db.query('INSERT INTO evaluate (emp_id, score, evaluate_date) VALUES ((SELECT MAX(emp_id) FROM employee), 5, CURRENT_DATE())',
      [emp_id, score],
      (err, results) => {
         err ? console.log('/create/evaluate ' + err) : res.send(results)
      })
});

app.post('/create/work_schedule', (req, res) => {
   const date = req.body.date
   db.query("INSERT INTO work_schedule (sched_id, sched_date) VALUES (NULL, ?)", [date],
      (err, results) => {
         err ? console.log('/create/work_schedule ' + err) : res.send(results)
      })
});

app.post('/create/scheduling', (req, res) => {
   const emp_id = req.body.emp_id
   const dept = req.body.dept
   db.query("INSERT INTO scheduling (scheduling_id, sched_id, emp_id, dept_name) VALUES (NULL, (SELECT MAX(sched_id) FROM work_schedule), ?, ?)",
      [emp_id, dept],
      (err, results) => {
         err ? console.log('/create/scheduling ' + err) : res.send(results)
      })
});

app.post('/create/work_attendance', (req, res) => {
   const time_in = req.body.time_in
   const status = req.body.status
   const emp_id = req.body.emp_id
   const sched_id = req.body.sched_id
   db.query("INSERT INTO work_attendance (work_attend_id, time_in, time_out, status, emp_id, sched_id) VALUES (NULL, ?, NULL, ?, ?, ?)",
      [time_in, status, emp_id, sched_id],
      (err, results) => {
         err ? console.log('/create/work_attendance ' + err) : res.send(results)
      })
});

app.post('/create/payment_history', (req, res) => {
   const wage = req.body.wage
   const sched_id = req.body.sched_id
   const emp_id = req.body.emp_id
   db.query("INSERT INTO payment_history (payment_his_id, wage, sched_id, emp_id) VALUES (NULL, ?, ?, ?)",
      [wage, sched_id, emp_id],
      (err, results) => {
         err ? console.log('/create/payment_history ' + err) : res.send(results)
      })
});

app.post('/create/work_exchange', (req, res) => {
   const wait_date = req.body.wait_date
   const scheduling_id = req.body.scheduling_id
   const exchange_scheduling_id = req.body.exchange_scheduling_id
   db.query("INSERT INTO work_exchange (work_exchange_id, wait_date, scheduling_id, exchange_scheduling_id) VALUES (NULL, ?, ?, ?)",
      [wait_date, scheduling_id, exchange_scheduling_id],
      (err, results) => {
         err ? console.log('/create/work_exchange ' + err) : res.send(results)
      })
});

app.post('/create/notification', (req, res) => {
   const { type, nname, date } = req.body
   db.query("INSERT INTO notification (notification_id, type, notification_date, nname, date) VALUES (NULL, ?, CURRENT_DATE(), ?, ?)",
      [type, nname, date],
      (err, results) => {
         err ? console.log('/create/notification ' + err) : res.send(results)
      })
});



//==================================================================================================================================================//
// Update //
//==================================================================================================================================================//

app.post('/update/scheduling', (req, res) => {
   const sched_id = req.body.sched_id
   const emp_id = req.body.emp_id
   const dept = req.body.dept
   db.query("INSERT INTO scheduling (scheduling_id, sched_id, emp_id, dept_name) VALUES (NULL, ?, ?, ?)",
      [sched_id, emp_id, dept],
      (err, results) => {
         err ? console.log('/update/scheduling ' + err) : res.send(results)
      })
});

app.put('/update/emp', (req, res) => {
   const id = req.body.id
   const fname = req.body.fname
   const lname = req.body.lname
   const nname = req.body.nname
   const password = req.body.password
   const line_account = req.body.line_account
   const phone = req.body.phone
   const job_title = req.body.job_title
   db.query("UPDATE employee SET fname = ?, lname = ?, nname = ?, password = ?, line_account = ?, phone = ?, job_title = ? WHERE emp_id = ?",
      [fname, lname, nname, password, line_account, phone, job_title, id],
      (err, results) => {
         err ? console.log('/update/emp ' + err) : res.send(results)
      }
   );
})

app.put('/update/work_history', (req, res) => {
   const emp_id = req.body.emp_id
   const job_hours = req.body.job_hours
   const absent_quantity = req.body.absent_quantity
   const late_quantity = req.body.late_quantity
   const leave_quantity = req.body.leave_quantity
   db.query("UPDATE work_history SET job_hours = job_hours+?, absent_quantity = absent_quantity+?, late_quantity = late_quantity+?, leave_quantity = leave_quantity+? WHERE emp_id = ?",
      [job_hours, absent_quantity, late_quantity, leave_quantity, emp_id],
      (err, results) => {
         err ? console.log('/update/work_history ' + err) : res.send(results)
      }
   );
})

app.put('/update/work_attendance', (req, res) => {
   const work_attend_id = req.body.work_attend_id
   const time_out = req.body.time_out
   db.query("UPDATE work_attendance SET time_out = ? WHERE work_attend_id = ?",
      [time_out, work_attend_id],
      (err, results) => {
         err ? console.log('/update/work_attendance ' + err) : res.send(results)
      }
   );
})

app.put('/update/device_token', (req, res) => {
   const emp_id = req.body.emp_id
   const device_token = req.body.device_token
   db.query("UPDATE employee SET device_token = ? WHERE emp_id = ?",
      [device_token, emp_id],
      (err, results) => {
         err ? console.log('/update/device_token ' + err) : res.send(results)
      }
   );
})

app.post('/update/dept', (req, res) => {
   const emp_id = req.body.emp_id
   const dept_name = req.body.dept_name
   db.query('INSERT INTO department (emp_id, dept_name) VALUES (?, ?)', [emp_id, dept_name],
      (err, results) => {
         err ? console.log('/create/dept ' + err) : res.send(results)
      })
});

app.put('/update/exchange/scheduling', (req, res) => {
   const { scheduling_id, exchange_scheduling_id } = req.body
   db.query("SELECT * FROM `scheduling` WHERE scheduling_id IN (?, ?)",
      [scheduling_id, exchange_scheduling_id],
      (err, results) => {
         if (err) {
            console.log('/update/exchange/scheduling - SELECT scheduling ' + err)
         } else {
            const scheduling_id_1 = results[0].scheduling_id
            const sched_id_1 = results[0].sched_id
            const scheduling_id_2 = results[1].scheduling_id
            const sched_id_2 = results[1].sched_id
            console.log('exchange:', results);

            db.query("UPDATE scheduling SET sched_id = ? WHERE scheduling_id = ?",
               [sched_id_2, scheduling_id_1],
               (err) => {
                  err ? console.log('/update/exchange/scheduling - UPDATE scheduling1 ' + err) : null
               })
            db.query("UPDATE scheduling SET sched_id = ? WHERE scheduling_id = ?",
               [sched_id_1, scheduling_id_2],
               (err) => {
                  err ? console.log('/update/exchange/scheduling - UPDATE scheduling2 ' + err) : null
               })
            res.send('/update/exchange/scheduling success')
         }
      })
});

//==================================================================================================================================================//
// Delete //
//==================================================================================================================================================//

app.delete('/delete/emp/:id', (req, res) => {
   const id = req.params.id
   db.query('DELETE FROM employee WHERE employee.emp_id = ?', [id],
      (err, results) => {
         err ? console.log('/delete/emp/:id ' + err) : res.send(results)
      }
   );
})

app.delete('/delete/department/:id', (req, res) => {
   const id = req.params.id
   db.query('DELETE FROM department WHERE emp_id = ?', [id],
      (err, results) => {
         err ? console.log('/delete/department/:id ' + err) : res.send(results)
      }
   );
})

app.delete('/delete/work_schedule', (req, res) => {
   const sched_id = req.query.sched_id
   db.query("DELETE FROM work_schedule WHERE sched_id = ?",
      [sched_id],
      (err, results) => {
         err ? console.log('/delete/work_schedule ' + err) : res.send(results)
      }
   );
})

app.delete('/delete/emp_in_scheduling', (req, res) => {
   const sched_date = req.query.sched_date
   db.query("DELETE FROM scheduling WHERE sched_id = (SELECT sched_id FROM work_schedule WHERE sched_date = ?)",
      [sched_date],
      (err, results) => {
         err ? console.log('/delete/emp_in_scheduling ' + err) : res.send(results)
      }
   );
})

app.delete('/delete/a_emp_in_scheduling', (req, res) => {
   const id = req.query.id
   const sched_date = req.query.sched_date
   db.query("DELETE FROM scheduling WHERE emp_id = ? AND sched_id = (SELECT sched_id FROM work_schedule WHERE sched_date = ?)",
      [id, sched_date],
      (err, results) => {
         err ? console.log('/delete/a_emp_in_scheduling ' + err) : res.send(results)
      }
   );
})

app.delete('/delete/a_work_exchange', (req, res) => {
   const work_exchange_id = req.query.work_exchange_id
   db.query("DELETE FROM work_exchange WHERE work_exchange_id = ?",
      [work_exchange_id],
      (err, results) => {
         err ? console.log('/delete/a_work_exchange ' + err) : res.send(results)
      }
   );
})

app.delete('/delete/a_notification', (req, res) => {
   const notification_id = req.query.notification_id
   db.query("DELETE FROM notification WHERE notification_id = ?",
      [notification_id],
      (err, results) => {
         err ? console.log('/delete/a_notification ' + err) : res.send(results)
      }
   );
})

//==================================================================================================================================================//
// Scheduler 
//==================================================================================================================================================//
const scheduler = require('./scheduler');
scheduler.initCron()


app.listen(process.env.PORT || 12123, function () {
   console.log('CORS-enabled web server listening on port 81')
});