const workerId = '557058:b7427c8c-0198-4748-b275-68a09f72c701'
if (location.href.indexOf('https://bitbucket.org') > -1) {
  $(document).ready(function() {
    // kiem tra url la pull request khi f5
    if (isPullRequestUrl(location.href)) {
      console.log(2)
      appendLogtimeForm()
    }
  })
}

function sendToBackground(data, callback) {
  chrome.runtime.sendMessage(
    data,
    callback
  )
}

function sleepTime(time) {
  return new Promise(function(resolve) {
    setTimeout(resolve, time)
  })
}

function isPullRequestUrl(url) {
  const regex = /^https:\/\/bitbucket\.org\/nldanang\/(.?)+\/pull-requests\/(.?)+/gm
  return url.match(regex) && url.match(regex)[0]
}

function isValidBranchName() {
  return $('[data-module-key="dvcs-connector-issue-key-linker"]').length > 0
}

function getTaskName() {
  return $('[data-module-key="dvcs-connector-issue-key-linker"]').html()
}

function getTaskId() {
  return new Promise(function(resolve, reject) {
    var taskName = getTaskName()
    if (!taskName) {
      resolve(null)
    }

    sendToBackground({
      method: 'GET_TASK_ID',
      data: taskName
    }, function(res) {
      if (res) {
        resolve(res)
      } else {
        resolve(null)
      }
    })
  })
}

function getCurrentLogtime() {
  var now     = new Date()
  var year    = now.getFullYear()
  var month   = ('0' + (now.getMonth() + 1)).slice(-2)
  var day     = ('0' + now.getDate()).slice(-2)

  return `${year}-${month}-${day}T08:00:00.000`
}

function logtime(taskId, workTime, description) {
  return new Promise(function(resolve, reject) {
    var taskName = getTaskName()
    if (!taskName) {
      resolve(null)
    }

    sendToBackground({
      method: 'LOGTIME',
      data: {
        attributes: {},
        billableSeconds: workTime,
        originTaskId: taskId,
        remainingEstimate: 0,
        started: getCurrentLogtime(),
        timeSpentSeconds: workTime,
        workerId: workerId,
        comment: description
      }
    }, resolve())
  })
}

async function appendLogtimeForm() {
  if ($('.neo-logtime-form').length) return
  if (!$('section[aria-label="Pull request description"]').length) {
    await sleepTime(1000)
    appendLogtimeForm()
    return
  }

  if (!isValidBranchName()) return

  var container = $('section[aria-label="Pull request description"]').first().parent()

  var taskId = await getTaskId()

  if (!taskId) return

  var el = $('<div class="neo-logtime-form">')
  var title = $('<h2>').html('Logtime')
  var label1 = $('<label>').html('Hours')
  var hourInput = $('<input type="number" min="0" max="24" placeholder="Hours"/>')
  var label2 = $('<label>').html('Description')
  var descriptionInput = $('<textarea placeholder="Description">')
  var buttonSubmit = $('<button>').html('Logtime').on('click', async function() {
    $(this).prop('disabled', true).addClass('loading')
    var workTime = parseFloat(hourInput.val()) * 3600 // hours to seconds
    var description = descriptionInput.val()
    await logtime(taskId, workTime, description)
    $(this).prop('disabled', false).removeClass('loading')
    // sendToBackground({
    //   method: 'NOTIFY',
    //   data: {
    //     message: 'Logtime thành công',
    //     title: 'Thông báo'
    //   }
    // })
  })

  el.append(title).append(label1).append(hourInput).append(label2).append(descriptionInput).append(buttonSubmit)
  container.prepend(el)
}

chrome.runtime.onMessage.addListener(
  // listen for messages sent from background.js
  function(request, sender, sendResponse) {
    // kiem tra url la pull request khi redirect
    if (isPullRequestUrl(request.url)) {
      console.log(1)
      appendLogtimeForm()
    }
})
