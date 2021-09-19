document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', compose_email);

  // On form submit
  document.querySelector('form').onsubmit = send_email;

  // By default, load the inbox
  load_mailbox('inbox');
});

function send_email(event) {

  // Prevent page reload
  event.preventDefault();
  const recipients = document.querySelector('#compose-recipients').value
  const subject = document.querySelector('#compose-subject').value
  const body = document.querySelector('#compose-body').value
  
  // send email and listen for response
  fetch('/emails', {
    method: 'POST',
    body: JSON.stringify({
        recipients: recipients,
        subject: subject,
        body: body
    })
  })
  .then(response => response.json())
  .then(result => {
      load_mailbox('sent');
      if (result.error) { 
        show_alert_msg('danger', result.error)
      } 
      else { 
        show_alert_msg('success', 'Email sent succesfully') 
    }
  })
  .catch((error) => {
    console.log(error)
  });
}

function compose_email() {

  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#email-view').style.display = 'none';
  document.querySelector('#alert-message').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';

  // Clear out composition fields
  document.querySelector('#compose-recipients').value = '';
  document.querySelector('#compose-subject').value = '';
  document.querySelector('#compose-body').value = '';
}

function load_mailbox(mailbox) {
  
  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#email-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#alert-message').style.display = 'none';

  // Show the mailbox name
  document.querySelector('#emails-view').innerHTML = 
    `<h3 class="mailbox-title">${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

  // Create email header text
  let header = document.createElement('div');
  header.setAttribute('class', 'emails-header');
  header.innerHTML = 
    `<div class="row">
      <h5 class="col email-title">From:</h5>
      <h5 class="col email-title">Subject</h5>
      <h5 class="col email-title">Date</h5>
    </div>`
  document.querySelector('#emails-view').append(header);

  // Display emails if any
  display_emails(mailbox);
}

function display_emails(mailbox) {

  // query for emails
  fetch(`/emails/${mailbox}`)
  .then(response => response.json())
  .then(emails => {
    if (emails.error) {
      show_alert_msg('danger', email.error);
    }

    if (emails.length == 0) {
      document.querySelector('#emails-view').innerHTML =
        `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)} is empty</h3>`
    }
    else {

      // Loop over emails and create html
      for (const email of emails) {
        let element = document.createElement('div');
        element.setAttribute('class', 'row');
        element.innerHTML = 
          `<p class="col">${email.sender}</p><p class="col">${email.subject}</p><p class="col">${email.timestamp}</p>`
        if (email.read) { 
          element.classList.add('read');
        }
        element.addEventListener('click', () => { 
          load_email(email.id, mailbox)
        }, false);
        document.querySelector('#emails-view').append(element);
      }
    }
  })
  .catch(error => {
    console.log(error);
  });
}

// Display individual email
function display_email(email, mailbox) {

  // Hide other views and just display email
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#email-view').style.display = 'block';
  document.querySelector('#alert-message').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';


  // Create html for email
  document.querySelector('#email-view').innerHTML =
    `<div class="email-header row">
      <h4 class="col-4 text-left">${email.subject}</h4>
      <h3 class="col-4"></h3>
      <p class="col-4">${email.timestamp}</p>
    </div>
    <div class="email-addresses text-left">
      <p class="font-weight-bold">From: ${email.sender}</p>
      <p class="font-weight-bold">To: ${email.recipients}</p>
    </div>
    <div class="email-body text-left">
      <p>${email.body}</p>
    </div>
    <div class="email-view-btns float-left">
    </div>`
  
  // Only add buttons if viewing emails in inbox or archive
  if (mailbox !== 'sent') {

    let replyBtn = document.createElement('button');
    replyBtn.innerHTML = 'Reply';
    replyBtn.addEventListener('click', () => {
      reply_email(email);
    }, false);
    replyBtn.setAttribute('class', 'btn btn-primary')
    document.querySelector('.email-view-btns').append(replyBtn)

    let archiveBtn = document.createElement('button');
    archiveBtn.innerHTML = email['archived'] ? 'Unarchive' : 'Archive';
    archiveBtn.addEventListener('click', () => {
      set_archived(email);
    }, false);
    archiveBtn.setAttribute('class', 'btn btn-primary')
    document.querySelector('.email-view-btns').append(archiveBtn);
  }
}

// Find email by id, display and mark as read
function load_email(id, mailbox) {

  // Query for email and listen for response
  fetch(`/emails/${id}`)
  .then(response => response.json())
  .then(email => {
    document.querySelector('#email-view').style.display = 'block';
    if (email.error) {
      show_alert_msg('danger', 'Email not found')
    }
    else {
      display_email(email, mailbox)
    }
  })
  .then(() => {
    fetch(`/emails/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
          read: true
        })
      });
    })
    .catch(error => {
      console.log(error);
    });
  }

function set_archived(email) {
  fetch(`/emails/${email.id}`, {
    method: 'PUT',
    body: JSON.stringify({
        archived: !email.archived
      })
    })
  .then(() => {
    load_mailbox('inbox');
    let msg = !email.archived ? 'Email archived' : 'Email unarchived';
    show_alert_msg('success', msg);
  })
}

function reply_email(email) {
  compose_email();
  document.querySelector('#compose-recipients').value = email.sender;
  document.querySelector('#compose-subject').value = email.subject.includes('Re: ') ? email.subject : `Re: ${email.subject}`;
  document.querySelector('#compose-body').value = `On ${email.timestamp} ${email.sender} wrote: ${email.body}`;
}

function show_alert_msg(status, msg) {
  document.querySelector('#alert-message').style.display = 'block';
  document.querySelector('#alert-message').innerHTML = msg;
  document.querySelector('#alert-message').setAttribute('class', `alert alert-${status}`);
}