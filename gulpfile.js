var gulp = require("gulp");
var fs = require("fs");
var fetchURL = require("fetch").fetchUrl;
var xml = require("xml");

gulp.task("default", function () {
  fs.readFile("./repo.json", "utf-8", function (err, data) {
    if (err) {
      console.log(err);
    }
    else {
      data = JSON.parse(data);
      if (data) {
        for (var i in data) {
          rxml(data[i]);
        }
      }
    }
  });

  return true;
});

/**
 *
 * @param config
 */
function rxml(config) {
  var releasesURL = rxml_replace("https://api.github.com/repos/%USER%/%REPO%/releases?access_token=%ATOK%", config);

  fetchURL(releasesURL, function (error, meta, body) {
    if (error) {
      console.log('Error loading: ', releasesURL);
    }
    else {
      var content = JSON.parse(body.toString());

      // Error.
      if (!content || content.message) {
        console.log('Error: ', content);
        return;
      }

      if (content) {
        // example
        // https://updates.drupal.org/release-history/xmlsitemap/7.x

        var major = '1';

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

            release.push({'name': rxml_replace("%REPO% %VERSION%", config).replace("%VERSION%", release_github.tag_name)});
            release.push({'version': rxml_replace("%VERSION%", config).replace("%VERSION%", release_github.tag_name)});
            release.push({'tag': rxml_replace("%VERSION%", config).replace("%VERSION%", release_github.tag_name)});
            release.push({'version_major': match[1]});
            release.push({'version_patch': match[2]});
            release.push({'status': 'published'});
            release.push({'release_link': release_github.html_url});
            release.push({'download_link': rxml_replace(release_github.tarball_url + "?access_token=%ATOK%", config)});
            release.push({'date': date});
            // release.push({ 'mdhash' : '' });
            // release.push({ 'filesize' : '' });
            release.push({'terms': []});

            var files = [];

            // ZIP.
            filepath = rxml_replace(release_github.zipball_url + "?access_token=%ATOK%", config);
            fileinfo = rxml_fileinfo(filepath);
            files.push({
              'file': [
                {'url': filepath},
                {'archive_type': 'zip'},
                {'md5': fileinfo.md5},
                {'size': fileinfo.size},
                {'filedate': date}
              ]
            });

            // TAR.GZ.
            filepath = rxml_replace(release_github.tarball_url + "?access_token=%ATOK%", config);
            fileinfo = rxml_fileinfo(filepath);
            files.push({
              'file': [
                {'url': filepath},
                {'archive_type': 'tar.gz'},
                {'md5': fileinfo.md5},
                {'size': fileinfo.size},
                {'filedate': date}
              ]
            });

            release.push({'files': files});

            releases.push({'release': release});
          }
        }

        var project = [
          {
            project: [
              {_attr: {'xmlns:dc': 'http://purl.org/dc/elements/1.1/'}},
              {'title': rxml_replace("%USER%/%REPO%", config)},
              {'short_name': rxml_replace("%REPO%", config)},
              {'dc:creator': rxml_replace("%USER%", config)},
              {'type': 'project_module'},
              {'api_version': '7.x'},
              {'recommended_major': major},
              {'supported_majors': major},
              {'default_major': major},
              {'project_status': 'published'},
              {
                'terms': [
                  {
                    'term': [
                      {'name': 'Projects'},
                      {'value': 'Modules'}
                    ]
                  },
                  {
                    'term': [
                      {'name': 'Maintenance status'},
                      {'value': 'Actively maintained'}
                    ]
                  },
                  {
                    'term': [
                      {'name': 'Development status'},
                      {'value': 'Under active development'}
                    ]
                  }
                ]
              },
              {
                'releases': releases
              }
            ]
          }
        ];

        var output = xml(project, true);

        fs.writeFile('./release.xml', output, function (err) {
          if (err) {
            throw err;
          }
        });
      }
    }
  });
}

/**
 *
 * @param string
 * @param config
 * @returns {XML}
 */
function rxml_replace(string, config) {
  return string
    .replace('%USER%', config.user)
    .replace('%REPO%', config.repo)
    .replace('%ATOK%', config.atok);
}

/**
 * Retrieves the file and gets its md5 hash and filesize.
 *
 * @param filepath
 */
function rxml_fileinfo(filepath) {
  var fileinfo = {md5: '', size: ''};

  // TODO

  return fileinfo;
}
