use Template;
use JSON qw/from_json/;

my $data = from_json join $/, <>;

my $includes = $data->{includes};
my $vars     = $data->{vars};
my $input    = $data->{template};

my $config = {
    INCLUDE_PATH => $includes,
    INTERPOLATE  => 0,
    POST_CHOMP   => 1,
};

my $template = Template->new($config);

$template->process(\$input, $vars)
    || die $template->error();
