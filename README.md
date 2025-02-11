# WikiEdu Impact Visualizer

## Adding and Managing Topics

Currently, Topics are managed via the Rails Console and some Rake tasks. Below are steps for setting up a new Topic and preparing data for analysis. If not running locally, the following assumes you have SSH access to the server and your public SSH key is appropriately installed on the server.

### Rails Console

- If running locally: run `rails console` from project directory.
- If setup for local development, but running on remote server: `cap rails:console`.
- If NOT setup locally, but running on remote server:
	1. SSH into server
	2. Navigate into *current* within project directory. Example: `cd /var/www/impact-visualizer/current`
	3. `RAILS_ENV=production bundle exec rails console`

### Create Topic in Rails Console
```ruby
Topic.create(
	name: 'Topic Name',
	slug: 'topic_name',
	description: 'Brief description of topic',
	editor_label: 'participant',
	start_date: Date.new(2022, 1, 1),
	end_date: Date.new(2022, 12, 31),
	timepoint_day_interval: 365,
	wiki_id: 1,
	display: true
)
```

### Explanation of fields
- `name`: The topic's name. Spaces OK. Should be title cased. 
- `slug`: A URL-safe version of the Topic's name. 
- `description`: A description of the Topic and participant group.
- `editor_label`: A lowercase word to describe the users whose activity will be visualized. "participant" is the default.
- `start_date`: a Ruby Date object representing the start of the analysis period.
- `end_date`: a Ruby Date object representing the end of the analysis period.
- `timepoint_day_interval`: the number of days between analysis timepoints (between the start and end dates). An interval of 30, for example, would roughly lead to monthly analysis snapshots. Typically, the longer the topic's timeframe, the higher this number should be (for both visualization and analysis speed reasons). 
- `wiki_id`: The ID of the associated Wiki version. Run `Wiki.all` to see all available options.
- `display`: a boolean switch to determine whether or not the Topic will be displayed on homepage of visualizer. Should be left as `false` until topic's data is ready to be displayed.

### Edit Topic in Rails Console
You can edit the topic in the Rails console like so:

```ruby
topic = Topic.find_by(slug: 'topic_name')
topic.update(editor_label: 'editor')
```

## Importing Articles and Users for Topic

### CSV Preparation
Two CSV files are required for the importing of Topic data, one for Articles and another for Users. They should be prepared as follows. See *csv/topic-articles-example.csv* and *csv/topic-users-example.csv* for example files. 

1. CSV files should be named using the following pattern:
	- `topic-articles-topic_slug.csv` where "topic_slug" is the Topic's slug.
	- `topic-users-topic_slug.csv` where "topic_slug" is the Topic's slug.
2. CSV files should contain Article titles (example: "California red-legged frog" OR User screen names (example: "MattFordham"). Each entry should be on its own line/row. Only the 1 column should be present. If User names or Article titles contain commas, the name/title must be wrapped in double quotes. There should be no commas outside of quoted text.
3. If running locally, the CSV files should be placed within the *db/csv/* directory, alongside the aforementioned example files. If running on server, the files should be placed in the project's "shared/db/csv" directory, which will likely be somewhere like */var/www/impact-visualizer/shared/db/csv*.

### Import Script

With the CSV files in place, you can now run the import script. 

#### If running locally, you can execute the script like so:

- `rake import_topic topic_slug` where "topic_slug" is the Topic's slug.

#### If running on a server...

As this import script will fetch information about each Article and User it can take a long time. **Given this, it is recommended that the script be run within a tool like [tmux](https://github.com/tmux/tmux/wiki/Getting-Started),** which will allow you to disconnect from the server and leave the script running. You can log back in a later time to check progress or results. 

1. SSH into server
2. Run `tmux` to start a new tmux session OR `tmux a` to attach to an existing tmux session. 
2. Within a tmux session, navigate into *current* within project directory. Example: cd /var/www/impact-visualizer/current
3. Run `RAILS_ENV=production rake import_topic topic_slug`
4. Optional: while the above command is running, detach from the tmux session using the key command *Ctrl+B then D*. You can now safely close the SSH connection to the server and return (and reattach to tmux session) at a later time.

## Generating Timepoints

After you have both created a Topic via `rails console` and imported associated articles and users via `rake import_topic topic_slug`, you are now ready to "generate timepoints" which is the process of preparing and analyzing the data needed for visualization. To do this, there is another Rake task/script.

#### If running locally, you can execute the script like so:

- `rake generate_timepoints topic_slug` where "topic_slug" is the Topic's slug.

#### If running on a server...

The note above about the usage of tmux also applies here, perhaps even more so, depending on the specifics of your Topic. **Use tmux!**

1. SSH into server
2. Run `tmux` to start a new tmux session OR `tmux a` to attach to an existing tmux session. 
2. Within a tmux session, navigate into *current* within project directory. Example: cd /var/www/impact-visualizer/current
3. Run `RAILS_ENV=production rake generate_timepoints topic_slug`
4. Optional: while the above command is running, detach from the tmux session using the key command *Ctrl+B then D*. You can now safely close the SSH connection to the server and return (and reattach to tmux session) at a later time.

### Updating Existing Timepoints

After the initial timepoint generation for a Topic has taken place, you may safely run the same `generate_timepoints` script again to capture additional data (perhaps because the timeframe has changed or new articles have been added). Running the script again, as specified above, will generally NOT cause analysis of existing articles to take place again. Because of this, subsequent runs will be much faster. 

If you would like to force existing analysis to be recomputed, you may force updates by adding "true" to the end of the command, such as this:

- `rake generate_timepoints topic_slug true`


## Local Development

### Requirements
- Ruby 3.2.2
- Node 18.17.1
- Postgres
- Ruby Gems and Bundler for managing Ruby dependencies
- Yarn for managing Node dependencies

### Install Dependencies

1. `bundle install`
2. `yarn install`

### Create & Migrate Database

1. Create the following Postgres databases:
	1. *impact-visualizer-development*
	2. *impact-visualizer-test*
3. `rake db:create`
4. `rake db:migrate`

### Run Server & Front-end Compiler

1. `rails server`
2. `vite dev` (in a 2nd terminal window/pane)
3. The project http://localhost:3000

### Run Tests

1. `rspec` (tests are located in */spec* directory)

## Configuring React Environment

### Local setup

In the project's root directory, create a `.env.local` file following the format of the `.env.example` file

### Server setup

In the project's root directory, create a `.env.production` file following the format of the `.env.example` file

## Deploying Updates to Server

1. Ensure server has your public SSH key 
2. Server will pull from *production* branch, so: `git push production`
3. `bundle exec cap production deploy`

In addition to deploying the latest code, the above deploy command will run any pending Rails migrations and will also compile front-end resources. To learn more about other, more granular, Capistrano commands [see their documentation](https://capistranorb.com/documentation/overview/what-is-capistrano/).

## Configuring and Deploying to new Server

1. Setup new Debian server
2. [Add SSH key to server](https://www.digitalocean.com/community/tutorials/how-to-set-up-ssh-keys-on-debian-11)
3. [Install Ruby and Bundler using RVM](https://tecadmin.net/install-ruby-on-debian/)
4. [Install Node](https://nodejs.org/en/download/package-manager#debian-and-ubuntu-based-linux-distributions)
5. [Install Git](https://www.digitalocean.com/community/tutorials/how-to-install-git-on-debian-10) and [add server key to Github](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account)
6. [Install Postgres](https://www.postgresql.org/download/linux/debian/) and create db: *impact-visualizer-production*
7. Create project directory at `/var/www/impact-visualizer`
8. [Install and configure NGINX and Passenger](https://www.phusionpassenger.com/docs/advanced_guides/install_and_upgrade/nginx/install/oss/bullseye.html)
9. Locally, run `cap production deploy` to deploy code