const videoScript = (vid) =>
  `C:/Users/klein_private/scoop/apps/python/current/Scripts/youtube-dl.exe -o "%%(channel_id)s-%%(channel)s/%%(title)s-%%(id)s.%%(ext)s" --external-downloader aria2c -f bestaudio[ext=m4a],bestvideo[ext=mp4] --add-metadata --xattrs --write-thumbnail --embed-thumbnail https://youtu.be/${vid}`;

const musicScript = (vid) =>
  `C:/Users/klein_private/scoop/apps/python/current/Scripts/youtube-dl.exe -o "%%(channel)s/%%(title)s.%%(ext)s" --external-downloader aria2c -f bestvideo[ext=mp4] --add-metadata --xattrs --write-thumbnail --embed-thumbnail https://youtu.be/${vid}`;

let scriptCount;

const refreshScriptCount = (cnt) =>
  chrome.action
    .setBadgeText({ text: cnt.toString() })
    .then(() => (scriptCount = cnt));

chrome.runtime.onInstalled.addListener(() =>
  chrome.storage.local
    .get("script")
    .then((old) => (old.script ? old.script.split("\n").length - 1 : 0))
    .then(refreshScriptCount)
    .then(() => chrome.action.setBadgeBackgroundColor({ color: "white" }))
);

const tabUrl = (info, tab) => tab.url;
const linkUrl = (info, tab) => info.linkUrl;
const extractVID = (page) => new URL(page).searchParams.get("v");

const builder = (url) => (template) => (info, tab) => {
  const vid = extractVID(url(info, tab));
  return chrome.storage.local
    .get("script")
    .then((old) =>
      chrome.storage.local.set({
        script: (old.script ?? "") + template(vid) + "\n",
      })
    )
    .then(() => refreshScriptCount(scriptCount + 1));
};

const cleanScripts = () =>
  chrome.storage.local.clear().then(() => refreshScriptCount(0));

const exportScripts = () =>
  chrome.storage.local
    .get("script")
    .then((v) =>
      v.script
        ? chrome.downloads.download({
            url: "data:text/bat;base64," + btoa(v.script),
            filename: "download-yt.bat",
          })
        : chrome.notifications.create({
            iconUrl: "/assets/images/icon48.png",
            title: "YouTube-DL Builder",
            message: "Nothing to be exported",
            type: "basic",
          })
    )
    .then(cleanScripts);

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "video",
    title: "Download this video",
    contexts: ["page"],
    documentUrlPatterns: ["https://*.youtube.com/watch?v=*"],
  });
  chrome.contextMenus.create({
    id: "audio",
    title: "Download this video as music",
    contexts: ["page"],
    documentUrlPatterns: ["https://*.youtube.com/watch?v=*"],
  });

  chrome.contextMenus.create({
    id: "video-link",
    title: "Download the linked video",
    contexts: ["link"],
    documentUrlPatterns: ["https://*.youtube.com/*"],
  });
  chrome.contextMenus.create({
    id: "audio-link",
    title: "Download the linked video as music",
    contexts: ["link"],
    documentUrlPatterns: ["https://*.youtube.com/*"],
  });

  chrome.contextMenus.create({
    id: "clear",
    title: "Clear saved scripts",
    documentUrlPatterns: ["https://*.youtube.com/*"],
  });
  chrome.contextMenus.create({
    id: "export",
    title: "Export and clear all saved scripts",
    documentUrlPatterns: ["https://*.youtube.com/*"],
  });
});

const handlers = {
  video: builder(tabUrl)(videoScript),
  audio: builder(tabUrl)(musicScript),
  "video-link": builder(linkUrl)(videoScript),
  "audio-link": builder(linkUrl)(musicScript),
  clear: cleanScripts,
  export: exportScripts,
};

chrome.contextMenus.onClicked.addListener((info, tab) =>
  handlers[info.menuItemId](info, tab)
);

chrome.action.onClicked.addListener((tab) => exportScripts());
