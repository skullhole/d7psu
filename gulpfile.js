var gulp = require("gulp");
var fs = require("fs");
var fetchURL = require("fetch").fetchUrl;
var xml = require("xml");
var argv = require("yargs").argv;

gulp.task("default", function () {
  /**
   * Extends object.
   *
   * @param obj
   * @returns {*}
   */
  var extend = function (obj) {
    var arg, i, k;
    for (i = 1; i < arguments.length; i++) {
      arg = arguments[i];
      for (k in arg) {
        if (arg.hasOwnProperty(k)) {
          obj[k] = arg[k];
        }
      }
    }
    return obj;
  };

  // Default options.
  var defaultConfig = {
    "user": "",
    "repo": "",
    "atok": "",
    "info": "1",
    "path": ".",
    "file": "release.xml",
    "conf": "repo.json",
    "suff": "1"
  };
  var config = extend({}, defaultConfig, argv);

  // User & Repo are given then use console params.
  if (config["user"] && config["repo"]) {
    d7psu(config);
  }

  // Read configuration file.
  else {
    fs.readFile(config["path"] + "/" + config["conf"], "utf-8", function (err, data) {
      if (err) {
        console.log(err);
      }
      else {
        data = JSON.parse(data);
        if (data) {
          data = extend({}, defaultConfig, data);
          d7psu(data);
        }
      }
    });
  }

  return true;
});

/**
 * Entry function for task "default".
 *
 * @param config
 */
function d7psu(config) {
  console.log(config);

  // Create release.xml file.
  // example: https://updates.drupal.org/release-history/block_token/7.x
  d7psuGithubAPI("https://api.github.com/repos/%USER%/%REPO%/releases?access_token=%ATOK%", config, function (content) {
    var major = "1";
    var releases = [], filepath, fileinfo;
    for (var index in content) {
      if (content.hasOwnProperty(index)) {
        var release_github = content[index],
          release = [];

        // Tag Name should be in format 7.x-N.N
        var regexp = /^7\.x-(\d+)\.(\d+)$/;
        if (!regexp.test(release_github.tag_name)) {
          continue;
        }

        // Reuseable info.
        var match = release_github.tag_name.match(regexp);
        var date = new Date(release_github.published_at).getTime() / 1000;

        // Set major as last version.
        major = match[1];

        release.push({"name": d7psuPrepareString("%REPO% %VERSION%", config).replace("%VERSION%", release_github.tag_name)});
        release.push({"version": d7psuPrepareString("%VERSION%", config).replace("%VERSION%", release_github.tag_name)});
        release.push({"tag": d7psuPrepareString("%VERSION%", config).replace("%VERSION%", release_github.tag_name)});
        release.push({"version_major": match[1]});
        release.push({"version_patch": match[2]});
        release.push({"status": "published"});
        release.push({"release_link": release_github.html_url});
        release.push({"download_link": d7psuGithubAPIPrepareURL(release_github.tarball_url + "?access_token=%ATOK%", config)});
        release.push({"date": date});
        // release.push({ "mdhash" : "" });
        // release.push({ "filesize" : "" });
        release.push({"terms": []});

        var files = [];

        // ZIP.
        filepath = d7psuGithubAPIPrepareURL(release_github.zipball_url + "?access_token=%ATOK%", config);
        fileinfo = d7psuFileStat(filepath);
        files.push({
          "file": [
            {"url": filepath},
            {"archive_type": "zip"},
            {"md5": fileinfo.md5},
            {"size": fileinfo.size},
            {"filedate": date}
          ]
        });

        // TAR.GZ.
        filepath = d7psuGithubAPIPrepareURL(release_github.tarball_url + "?access_token=%ATOK%", config);
        fileinfo = d7psuFileStat(filepath);
        files.push({
          "file": [
            {"url": filepath},
            {"archive_type": "tar.gz"},
            {"md5": fileinfo.md5},
            {"size": fileinfo.size},
            {"filedate": date}
          ]
        });

        release.push({"files": files});

        releases.push({"release": release});
      }
    }

    var project = [
      {
        project: [
          {_attr: {"xmlns:dc": "http://purl.org/dc/elements/1.1/"}},
          {"title": d7psuPrepareString("%USER%/%REPO%", config)},
          {"short_name": d7psuPrepareString("%REPO%", config)},
          {"dc:creator": d7psuPrepareString("%USER%", config)},
          {"type": "project_module"},
          {"api_version": "7.x"},
          {"recommended_major": major},
          {"supported_majors": major},
          {"default_major": major},
          {"project_status": "published"},
          {
            "terms": [
              {
                "term": [
                  {"name": "Projects"},
                  {"value": "Modules"}
                ]
              },
              {
                "term": [
                  {"name": "Maintenance status"},
                  {"value": "Actively maintained"}
                ]
              },
              {
                "term": [
                  {"name": "Development status"},
                  {"value": "Under active development"}
                ]
              }
            ]
          },
          {
            "releases": releases
          }
        ]
      }
    ];

    var output = xml(project, true);

    fs.writeFile(config["path"] + "/" + config["file"], output, function (err) {
      if (err) {
        throw err;
      }
    });
  });

  // Update *.info file.
  if (config["info"]) {
    // XML File Path in Repo (should exist).
    d7psuGithubAPI("https://api.github.com/repos/%USER%/%REPO%/contents/release.xml?access_token=%ATOK%", config, function (content) {
      // example: https://api.github.com/repos/skullhole/d7psu/contents/release.xml
      if (content.download_url) {
        // Create info file if missing.
        var info = config["path"] + "/" + d7psuPrepareString("%REPO%", config) + ".info", data;
        try {
          data = fs.readFileSync(info);
          data = data.toString();
        }
        catch (e) {
          data = "";
          console.log("Warning: *.info file does not exist. It will be generated.", "\n", e);
        }

        // Remove old "project status url" line.
        data = data.replace(/project status url\s*=.*\n?/, "");

        // Insert new "project status url" line.
        data += "\n";
        data += "project status url = ";
        data += content.download_url;
        if (config["suff"]) {
          data += config['atok'] ? "&" : "#";
        }
        data = data.replace(/\n\nproject status url/, "\nproject status url");

        // Save info file.
        fs.writeFile(info, data, function (err) {
          if (err) {
            console.log("Error: count not update *.info file.", "\n", err);
          }
          else {
            // Success.
          }
        });
      }
    });
  }
}

/**
 * Replaces tokens in string.
 *
 * @param string
 * @param config
 * @returns {XML}
 */
function d7psuPrepareString(string, config) {
  return string
    .replace("%USER%", config.user)
    .replace("%REPO%", config.repo)
    .replace("%ATOK%", config.atok);
}

/**
 * Prepares Github API URL.
 *
 * @param url
 * @param config
 * @returns {XML}
 */
function d7psuGithubAPIPrepareURL(url, config) {
  var urlPrepared = d7psuPrepareString(url, config);
  if (!config.atok) {
    urlPrepared = urlPrepared
      .replace("access_token=", "")
      .replace("&&", "&")
      .replace(/\?$/, "");
  }
  return urlPrepared;
}

/**
 * Asyncronously accesses Github API and processes it using a callback.
 *
 * @param url
 * @param config
 * @param callback
 */
function d7psuGithubAPI(url, config, callback) {
  var urlPrepared = d7psuGithubAPIPrepareURL(url, config);

  fetchURL(urlPrepared, function (error, meta, body) {
    if (error) {
      console.log("Error loading: ", urlPrepared);
    }
    else {
      var content = JSON.parse(body.toString());

      // Error.
      if (!content || content.message) {
        console.log("Error: ", urlPrepared, content);
        return;
      }

      if (content) {
        callback(content);
      }
    }
  })
}

/**
 * Retrieves the file and gets its md5 hash and filesize.
 *
 * @param filepath
 */
function d7psuFileStat(filepath) {
  var fileinfo = {md5: "", size: ""};

  // TODO

  return fileinfo;
}
