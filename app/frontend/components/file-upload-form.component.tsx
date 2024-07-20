// NPM
import _ from 'lodash';
import React from 'react';
import { useForm, FieldValues, SubmitHandler } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';

// Misc
import TopicService from '../services/topic.service';

// Components
import FileInput from './file-input.component';
import Spinner from './spinner.component';

function FileUploadForm({ defaultValues, name, label, hint,
                          onSubmitHook, onCompleteHook,
                          currentFilename, currentFilePath }) {
  const queryClient = useQueryClient()
  const { id } = defaultValues;

  const updateMutation = useMutation({
    mutationFn: (data: FieldValues) => {
      return TopicService.updateTopic(id, data);
    },
    onSuccess: (data) => {
      onCompleteHook();
      queryClient.setQueryData(['topic', id.toString()], data);
    },
    onError: (error) => {
      onCompleteHook();
      console.log(error);
    },
  })

  const saving = updateMutation.isPending;

  const onSubmit: SubmitHandler<FieldValues> = (data) => {
    onSubmitHook();
    updateMutation.mutate(data);
  }

  const { handleSubmit, control } = useForm<FieldValues>({ defaultValues })

  if (saving) {
    return <Spinner size='small' />
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      onChange={handleSubmit(onSubmit)}
    >
      <FileInput
        label={label}
        name={name}
        hint={hint}
        control={control}
        currentFilename={currentFilename}
        currentFilePath={currentFilePath}
      />
    </form>
  );
}

export default FileUploadForm;
