## Existing GenerateTimepointsJob Process Flow

Currently a single GenerateTimepointsJob runs through the following steps. The steps mostly need to be run in order to ensure valid data. The one exception is that only Steps #4 and #5 are continent on Step #1.

1. **Article Classification Loop**
   - Iterates through all articles in a topic with `ClassificationService.classify_all_articles`

2. **Primary Timestamp Processing Loop**
   - Iterates through all timestamps in a topic
   - For each timestamp, calls `build_timepoints_for_timestamp`:
       - For each article (for current timestamp), calls
       `build_timepoints_for_article`:
         - Creates/updates ArticleTimepoint
         - Updates stats for ArticleTimepoint (contingent upon previous ArticleTimepoints)
         - Creates/updates TopicArticleTimepoint
         - Updates stats for TopicArticleTimepoint (contingent upon previous TopicArticleTimepoint)

3. **Token Stats Processing Loop**
   - Parallel processes all articles
   - For each article, calls `update_token_stats_for_article`:
     - Fetches tokens for the latest revision
     - For each timestamp
 calls `update_token_stats_for_article_timestamp`, which updates token statistics for the article at that timestamp.

4. **TopicTimepoint Finalization Loop** (`build_topic_timepoints`)
   - Final iteration through all timestamps
   - For each timestamp:
     - Updates statistics for the topic timepoint

5. **Topic Summary Creation**
	- A single summary is created based on analysis of TopicTimepoints. Must happen last. 

     
## Potential Refactoring

1. **Chaining Five Big Jobs**: In order to make the job running more granular (for the sake of less disruptive failures), the simplest solution is to break each of the above into a separate jobs, but to ensure the jobs are run in order. Should one of them fail, the following should not be run. One way to accomplish this would be to use a "Job Chaining" pattern and task each step queue the next upon completion. Each job could have a `run_next_step` flag to enable running the jobs independently or as a series. 

2. **Chaining Five Big Jobs with "sub chains"** The "Job Chaining" pattern could be taken a step further/deeper by breaking each of the main 5 jobs into 5 "chains" of jobs. For example, the "Token Stats Processing Loop" is particularly time consuming and prone to timing out. Each `update_token_stats_for_article` call could be wrapped in its own job, which would queue the next one upon completion. OR, a parent "Token Stats" job could orchestrate the individual jobs.

**My gut says to start with just the above "Chaining Five Big Jobs"**

