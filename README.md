# Drupal 7 - Project Status URL

A gulp-based tool that allows you to host your custom modules on github, create releases for them and update modules using drush.

## Installation

For the tool to work you need the following files:
* `package.json` - describes the packages that should be included for the tool to function as intended;
* `gulpfile.js` - a [gulp](https://github.com/gulpjs/gulp) file that contains all the logic.

## Usage

###### Prerequisites

The below commands presume that 
* you're already opened console/terminal and moved to the tool's directory;
* you have [npm](https://www.npmjs.com/) installed;
* you ran `npm install` to install the dependencies.

###### Command

```
gulp [options]
```

There are two ways to pass the options:
* Using _configuration file_:
```
{
  "user": "skullhole",
  "repo": "d7psu",
  "atok": "",
  "info": "1",
  "path": '.',
  "file": "release.xml"
}
```
* Passing the command line parameters directly. 

###### Options

* `repo` - repository machine name, e.g. `d7psu` for the current repository;
* `user` - github username that owns the repository, e.g. `skullhole` for the current repository;
* `atok` - github access token that is allowed to use github API to view releases and file contents. You can create one on [Personal access tokens](https://github.com/settings/tokens) page of your github account. If your module's repo is public you may keep it empty, otherwise you want to add _Full control of private repositories_ permission. 
* `info` - defines if _MODULENAME.info_ should be created/updated with the _project status url_ configuration (*MODULENAME* is the `repo`). Default is 1 (enabled). That option makes sense when you want to use github-hosted xml file (see **Technical Details**). 
* `path` - directory name to check for configuration file and place the resulting _project status xml file_ and _MODULENAME.info_. Default is current directory.
* `conf` - relative path to the _configuration file_ (relatively to `path` value). Default is `repo.json`. 
* `file` - relative path to the resulting _project status xml file_ (relatively to `path` value). Default is `release.xml`.

## Examples

###### Configuration File In Tool's Directory 

Good when you host d7psu files into your project's directory.

Contents of `repo.json`:
```
{
  "user": "skullhole",
  "repo": "d7psu",
  "atok": "",
  "info": "1",
  "path": '.',
  "file": "release.xml"
}
```
With the above file you need only to run `gulp` in the directory that contains the above file. The result will be: 
-  _project status xml file_ `release.xml` file that can be used by Drupal to update the module;
- `d7psu.info` will be created/updated with _project status url_ line that points to github-hosted file. 

###### External Configuration File

That option is good when you for some reason don't want to have the access token exposed but don't want to type it every time in console.

If you have configration file stored somewhere outside of the tool's directory use: 
`gulp --conf=/path/to/config-file/config.json`

###### Simple Command Line Usage

For username is `USER` with the repository `REPO` and access token `ATOK` you want to use the below command:
`gulp --user=USER --repo=REPO --atok=ATOK`
The result will be: 
-  _project status xml file_ `release.xml` file in the tool's directory;
- `REPO.info` will be created/updated with _project status url_ line that points to github-hosted file. 

###### Advanced Command Line Usage

The advanced example is good when you want to set up own storage for _project status url_ XMLs. 

Say, you have the tool installed in directory `/path/to/tool` and you want to use directory `/path/to/project-status-url` for the resulting files:

`gulp --user=USER --repo=REPO --atok=ATOK --info=0 --path=/path/to/tool --file=../project-status-url/REPO.xml`
The above command:
- Will NOT do anything to the _MODULENAME.info_ file (because `info` is set to `0`);
- Add _REPO.xml_ file to the destination: `/path/to/project-status-url/REPO.xml`

## Technical Details

###### Using Own Storage Release XMLs 

In case you don't want to keep the _project status url_ XMLs in your repositories you may want to store them on some domain. 
When Drupal requests the _project status url_ XML it uses that line from the info file of your module (see **Updating With Drush**) and appends the core version and the name of the project (`repo`), e.g. if _project status url_ is set to `http://example.com/update-server` the requested URL will be `http://example.com/update-server/7.x/REPO`
Taking that into account you have two options: 
- Use the tool and create the files on server with options `--path=/path/to/example-com-root/update-server/7.x` and `--file=REPO`
- Disable _MODULENAME.info_ updates and specify the path to the _project status url_ XML file manually in _MODULENAME.info_ with an empty fragment suffix. E.g. line in the info file `project status url = http://example.com/update-server/REPO.xml#`. Then Drupal will be requesting the path `http://example.com/update-server/REPO.xml#/7.x/REPO` which will resolve correctly to the path you wanted. 

###### Caveats with Github-Hosted Release XMLs 

The tool uses Github API to add the path to github-hosted file to the _MODULENAME.info_. That operation **requires** that you already have the file with the given name in your repository. With that in mind the complete process of adding the tool to your repo is as follows: 

- Add tool's files (see **Installation**) and empty `release.xml` file to your repo and push to github. That step should be done once.
- Run the tool to populate the `release.xml` and _MODULENAME.info_ files. Add and push them to github. 
- For every further releases you want to publish the release on github first, then run the tool to generate xml file (with `--info=0` since _project status url_ won't change anyways), then add and push the release.xml file. 
NOTE: `release.xml` in your release will not be up to date in your public version of the module, that's the limitation of the process. 

###### Updating With Drush

You want to update your modules to the most recent version using the command:
`drush dl -y MODULENAME --no-md5=1 --source=0`

- Github API does not return md5 and file size for releases. We might download the files using the tool and calculate those, but that's an overhead, since there's `--no-md5=1` option that asks Drush to disregard file checks.

- Drush (at least version 7 that was used when developing the tool) has the caveat when regular run `drush dl -y MODULENAME` does not take _project status url_ in your _MODULENAME.info_ into account falling back to default Drupal's. 
To prevent that from happening you need to use `--source=0` option. 

Here's why that happens in Drush's code: 
In `drush_pm_download()`:
```
$status_url = drush_get_option('source', ReleaseInfo::DEFAULT_URL); // Makes it non-empty
```
And then in `pm_parse_request()`:
```
if ($status_url) { // It is not empty already. 
  $request['status url'] = $status_url;
}
elseif (!empty($projects[$project]['status url'])) {
  $request['status url'] = $projects[$project]['status url'];
}
```







