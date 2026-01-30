// NPM
import _ from "lodash";
import React from "react";
import { useForm, FieldValues } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";

// Misc
import TopicService from "../services/topic.service";

// Components
import GenericInput from "./generic-input.component";
import FileInput from "./file-input.component";
import SelectInput from "./select-input.component";
import DateInput from "./date-input.component";
import TextAreaInput from "./text-area-input.component";
import Spinner from "./spinner.component";

function TopicForm({ onSubmit, defaultValues, saving }) {
  const navigate = useNavigate();

  const { data: wikis } = useQuery({
    queryKey: ["wikis"],
    queryFn: TopicService.getAllWikis,
  });

  const { data: classifications } = useQuery({
    queryKey: ["classifications"],
    queryFn: TopicService.getAllClassifications,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      return TopicService.deleteTopic(id);
    },
    onSuccess: () => {
      toast.success(`Topic "${defaultValues.name}" successfully deleted`);
      navigate("/my-topics");
    },
    onError: (error) => {
      console.log(error);
      toast.error(`Failed to delete topic "${defaultValues.name}"`);
    },
  });

  const { handleSubmit, control, watch } = useForm<FieldValues>({
    defaultValues,
  });

  const watchConvertTokens = watch("convert_tokens_to_words");

  const wikiOptions = _.map(wikis, (wiki) => {
    return {
      label: `${wiki.language}.${wiki.project}`,
      value: wiki.id,
    };
  });

  const classificationOptions = _.map(classifications, (classification) => {
    return {
      label: classification.name,
      value: classification.id,
    };
  });

  function handleDeleteClick() {
    if (
      confirm(
        "Are you sure you want to delete this Topic? This cannot be undone."
      )
    ) {
      deleteMutation.mutate(defaultValues.id);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="Form">
      <div className="FormRow">
        <GenericInput
          name="name"
          label="Topic Name"
          control={control}
          rules={{ required: "A topic name is required" }}
        />

        <GenericInput
          name="slug"
          label="Topic Slug"
          control={control}
          rules={{ required: "A topic slug is required" }}
          hint="A URL friendly version of your topic's name"
        />
      </div>

      <div className="FormRow">
        <TextAreaInput
          name="description"
          label="Topic Description"
          control={control}
          rules={{ required: "A description is required" }}
          hint="A brief description of the Topic"
        />
      </div>

      <div className="FormRow">
        <SelectInput
          name="wiki_id"
          options={wikiOptions}
          label="Wiki"
          rules={{ required: "A Wiki Project is required" }}
          control={control}
        />

        <GenericInput
          name="editor_label"
          label="Participant Label"
          hint='Default is "participant"'
          rules={{ required: "A participant label is required" }}
          control={control}
        />
      </div>

      <div className="FormRow">
        <DateInput
          name="start_date"
          label="Start Date"
          hint="The start date for the topic analysis"
          rules={{ required: "A start date is required" }}
          control={control}
        />

        <DateInput
          name="end_date"
          label="End Date"
          hint="The end date for the topic analysis"
          rules={{ required: "An end date is required" }}
          control={control}
        />
      </div>

      <div className="FormRow">
        <GenericInput
          name="timepoint_day_interval"
          label="Timepoint Day Interval"
          type="number"
          rules={{ required: "A timepoint day interval is required" }}
          min={7}
          hint="The number of days between each analysis timepoint. Smaller values will provide greater analysis resolution but result in longer computation processes. 30 days is generally a good starting value."
          control={control}
        />

        <SelectInput
          name="chart_time_unit"
          options={[
            { value: "year", label: "Year" },
            { value: "month", label: "Month" },
            { value: "week", label: "Week" },
          ]}
          label="Chart Time Unit"
          control={control}
          hint="The default segmentation of time on resulting charts. The most appropriate setting will depend on your Topic's timeframe. Changing will not require reanalysis."
        />
      </div>

      <div className="FormRow FormRow--halves">
        <GenericInput
          name="convert_tokens_to_words"
          label="Convert Tokens to Words"
          type="checkbox"
          hint="Instead of displaying article token counts, convert to a count of words."
          control={control}
        />

        {watchConvertTokens && (
          <GenericInput
            name="tokens_per_word"
            label="Tokens per Word"
            type="text"
            rules={{
              required: "A value is required",
              pattern: {
                message: "Value must be numeric",
                value: /^\d*\.?\d+$/,
              },
            }}
            hint="The number of tokens will be divided by this value when displaying tokens as words."
            control={control}
          />
        )}
      </div>

      <div className="FormRow">
        <SelectInput
          name="classification_ids"
          isMulti
          options={classificationOptions}
          label="Classifications"
          control={control}
          hint=""
        />
      </div>

      <div className="FormRow">
        <FileInput
          name="users_csv"
          label="Users CSV"
          hint="A CSV file containing information related to topic Users"
          control={control}
          currentFilename={defaultValues.users_csv_filename}
          currentFilePath={defaultValues.users_csv_url}
        />

        <FileInput
          name="articles_csv"
          label="Articles CSV"
          hint="A CSV file containing information related to topic Articles"
          control={control}
          currentFilename={defaultValues.articles_csv_filename}
          currentFilePath={defaultValues.articles_csv_url}
        />
      </div>

      <div className="FormRow FormRow--actions">
        <input
          className="Button"
          type="submit"
          disabled={saving || deleteMutation.isPending}
        />
        {defaultValues.id && (
          <button
            type="button"
            className="TextButton TextButton--red"
            onClick={handleDeleteClick}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? (
              <span
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <Spinner size="small" color="red" /> Deleting Topic...
              </span>
            ) : (
              "Delete Topic"
            )}
          </button>
        )}
      </div>
    </form>
  );
}

export default TopicForm;
