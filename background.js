var jira_cookie = null
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    switch (request.method) {
      case 'GET_TASK_ID':
        getTaskId(request.data).then(function(taskId) {
          sendResponse(taskId)
        }).catch(function() {
          sendResponse(null)
        })
        break;

        case 'GET_TASK_ID':


      case 'LOGTIME':
        logtime(request.data).then(function(taskId) {
          sendResponse(taskId)
        }).catch(function() {
          sendResponse(null)
        })
        break;

      case 'NOTIFY':
        nofify(request.data)
        break;
      default: break;
    }

    return true;
  }
);

chrome.tabs.onUpdated.addListener(
  function(tabId, changeInfo, tab) {
    // read changeInfo data and do something with it
    // like send the new url to contentscripts.js
    if (changeInfo.url) {
      chrome.tabs.sendMessage( tabId, {
        message: 'hello!',
        url: changeInfo.url
      })
    }
  }
);

function getCookies(domain) {
  return new Promise(function(resolve, reject) {
    chrome.cookies.getAll({ domain: domain }, function(cookies) {
      console.log('cookies', cookies)
      if(cookies && cookies.length > 0) {
        var res = cookies.map(function(cookie){
          return cookie.name + '=' + cookie.value
        }).join('; ')
        resolve(res)
      }
    })
  })
}

async function getLogtimeToken() {
  const boardHTML = await requestApi({
    url: 'https://neo-universe.atlassian.net/plugins/servlet/ac/io.tempo.jira/tempo-app#!/my-work/timesheet'
  })

  const matchBoard = boardHTML.match(/https:\\u002F\\u002Fapp\.tempo\.io(.?)+jwt=(.?)+\"\,\"contextJwt/gm)
  if (!matchBoard || !matchBoard.length) return null

  const urlTempoIo = matchBoard[0].replaceAll('\\u002F', '/').slice(0, -13)
  const tempoHTML = await requestApi({
    url: urlTempoIo
  })
  const matchTempo = tempoHTML.match(/{"token":\s"(.?)+\s"exp/gm)

  if (!matchTempo || !matchTempo.length) return null

  return matchTempo[0].slice(11, -7)
}

function getTaskId(taskName) {
  return new Promise(async function(resolve, reject) {
    const cookie = await getCookies('.atlassian.net')
    const data = await requestApi({
      url: 'https://neo-universe.atlassian.net/rest/api/3/issue/picker',
      data: {
        currentJQL: 'project in projectsWhereUserHasPermission("Work on issues") order by lastViewed DESC',
        query: taskName,
        showSubTaskParent: true,
        showSubTasks: true
      },
      crossDomain: true,
      xhrFields: {
        withCredentials: true
      }
    })

    if (!data || !data.sections) {
      resolve(null)
    }

    resolve(data.sections[1].issues.find(item => item.key === taskName).id)
  })
}

function logtime(data) {
  return new Promise(async function(resolve, reject) {
    const token = await getLogtimeToken()
    await requestApi({
      url: 'https://app.tempo.io/rest/tempo-timesheets/4/worklogs/',
      method: 'post',
      dataType: "json",
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify(data),
      headers: {
        Authorization: `Tempo-Bearer ${token}`
      }
    })
    resolve()
  })
}

function nofify(params) {
  try {
    var {
      message,
      title
    } = params;
    title = title ? title : 'Notification';
    chrome.notifications.create('', {
      title: title,
      message: message,
      iconUrl: chrome.extension.getURL('/img/logo.png'),
      type: 'basic'
    }, function (res) {
      console.log(res)
    })
  } catch (err) {
    console.log(err)
  }
}

function requestApi(payload) {
  const {
    url,
    method,
    data,
    headers,
    dataType,
    contentType,
    crossDomain,
    xhrFields
  } = payload;
  return new Promise((resolve, reject) => {
    $.ajax({
      url: url,
      method: method ? method : 'get',
      headers: headers,
      data: data ? data : {},
      dataType: dataType ? dataType : undefined,
      contentType: contentType ? contentType : undefined,
      crossDomain: crossDomain ? crossDomain : undefined,
      xhrFields: xhrFields ? xhrFields : undefined,
      success: (res) => {
        return resolve(res)
      },
      error: (e) => {
        return reject(e)
      }
    })
  })
}
