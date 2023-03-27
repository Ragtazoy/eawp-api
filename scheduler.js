const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
const mysql = require('mysql2')
const cron = require('node-cron')
const moment = require('moment')

app.use(cors())
app.use(bodyParser.json())

const db = mysql.createConnection({
   host: '127.0.0.1',
   user: 'root',
   database: 'eawp_base'
});

const absent = async () => {
   var scheduling = {}
   var work_attendance = {}

   // Use Promise.all to wait for both queries to finish
   Promise.all([
      // Select scheduling
      new Promise((resolve, reject) => {
         db.query(`SELECT * FROM scheduling WHERE sched_id = (SELECT sched_id FROM work_schedule WHERE sched_date = '${moment().format('YYYY-MM-DD')}')`, (err, results) => {
            err ? reject(err) : scheduling = results; resolve()
         });
      }),
      // Select work_attendance
      new Promise((resolve, reject) => {
         db.query(`SELECT * FROM work_attendance WHERE sched_id = (SELECT sched_id FROM work_schedule WHERE sched_date = '${moment().format('YYYY-MM-DD')}')`, (err, results) => {
            err ? reject(err) : work_attendance = results; resolve()
         });
      })
   ]).then(() => {
      // Filter results using scheduling and work_attendance
      const filterScheduling = scheduling.filter(sched => !work_attendance.some(att => att.emp_id === sched.emp_id));
      console.log('filterScheduling:', filterScheduling);

      if (filterScheduling.length !== 0) {

         new Promise((resolve, reject) => {
            filterScheduling.forEach(sched => {
               console.log(sched.emp_id, sched.sched_id);
               // Update work_history //
               db.query(`UPDATE work_history SET absent_quantity = absent_quantity+1 WHERE emp_id = ${sched.emp_id}`, (err, results1) => {
                  err ? reject(err) : resolve(results1)
               });

               // Create work_attendance //
               db.query(`INSERT INTO work_attendance (work_attend_id, time_in, time_out, status, emp_id, sched_id) VALUES (NULL, NULL, NULL, 'absent', ${sched.emp_id}, ${sched.sched_id})`, (err, results2) => {
                  err ? reject(err) : resolve(results2)
               });

            });
         })

      }

   }).catch(err => reject(err));
}

const checkOut = async () => {
   const timeOut = await moment().hours(23).minutes(0).seconds(0).format('YYYY-MM-DD HH:mm:ss')

   new Promise((resolve, reject) => {
      db.query(`SELECT * FROM work_attendance WHERE sched_id = (SELECT sched_id FROM work_schedule WHERE sched_date = '${moment().format('YYYY-MM-DD')}') AND time_out IS null`, (err, results1) => {
         if (err) {
            reject(err)
         } else {
            if (results1.length !== 0) {

               results1.forEach(async (emp) => {

                  const jobMillisec = await +moment(timeOut) - +moment(emp.time_in)
                  const jobHours = await moment.duration(jobMillisec).hours()
                  let wage = await jobHours * 50
                  console.log('time in-out:', moment(emp.time_in).format('YYYY-MM-DD HH:mm:ss'), timeOut);
                  console.log('jobHours:', jobHours, 'wage:', wage);
                  console.log('emp_id:', emp.emp_id, 'sched_id:', emp.sched_id);

                  // Update work_history //
                  db.query(`UPDATE work_history SET job_hours = job_hours+${jobHours} WHERE emp_id = ${emp.emp_id}`, (err, results2) => {
                     err ? reject(err) : resolve(results2)
                  });

                  // Create payment_history //
                  db.query(`INSERT INTO payment_history(payment_his_id, wage, sched_id, emp_id) VALUES(NULL, ${wage}, ${emp.sched_id}, ${emp.emp_id})`, (err, results3) => {
                     err ? reject(err) : resolve(results3)
                  });

               });

               // Update work_attendance //
               db.query(`UPDATE work_attendance SET time_out = '${timeOut}' WHERE time_in LIKE '${moment().format('YYYY-MM-DD')}%' AND time_out IS null`, (err, results) => {
                  err ? reject(err) : resolve(results)
               });

            }
         }
      });
   });
};

const evaluate = async () => {
   console.log(moment().subtract(1, 'month').format('YYYY-MM-DD'));

   new Promise((resolve, reject) => {
      db.query(`SELECT * FROM work_history `, (err, results) => {
         if (err) {
            reject(err)
         } else {
            results.forEach(async (emp) => {

               let absent = await emp.absent_quantity * 2   // Absent      = -2
               let late = await emp.late_quantity           // late        = -1
               let leave = await emp.leave_quantity - 3 < 0 ? 0 : emp.leave_quantity - 3 // leave > 3   = -1
               let score = await 5 - (absent + late + leave)
               score = await score < 0 ? 0 : score

               console.log(emp.emp_id, 'absent:', emp.absent_quantity, 'late:', emp.late_quantity, 'leave:', emp.leave_quantity);
               console.log('score:', score, '|', absent + '-' + late + '-' + leave);

               // Create evaluate //
               db.query(`INSERT INTO evaluate (evaluate_id, emp_id, score, evaluate_date) VALUES (NULL, ${emp.emp_id}, ${score}, '${moment().subtract(1, 'M').set('date', 1).format('YYYY-MM-DD')}')`, (err, results3) => {
                  err ? reject(err) : resolve(results3)
               });

               // Reset work_history //
               db.query(`UPDATE work_history SET absent_quantity = 0, late_quantity = 0, leave_quantity = 0 WHERE emp_id = ${emp.emp_id}`, (err, results2) => {
                  err ? reject(err) : resolve(results2)
               });

            });
         }
      });
   })

}


module.exports = {
   initCron: () => {
      // Test
      cron.schedule('* * * * *', function () {
         // console.log('running a task Test');
         // absent()
      });

      // Run every day at 18:01
      cron.schedule('1 18 * * *', function () {
         console.log('running a task every day at 18:01');
         // absent()
      });

      // Run every day at 23:01
      cron.schedule('1 23 * * *', function () {
         console.log('running a task every day at 23:01');
         // checkOut()
      });

      // Run every day-of-month 1 at 00:00
      cron.schedule('0 0 1 * *', function () {
         console.log('running a task every day-of-month 1');
         // evaluate()
      });
   }
}
